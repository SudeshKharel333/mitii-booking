<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Mitii_Availability_Controller {

    const SLOT_MINUTES = 30;

    public static function register_routes() {
        register_rest_route( 'mitii/v1', '/staff/(?P<staff_id>\d+)/availability', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'get_availability' ),
            'permission_callback' => array( __CLASS__, 'check_admin_permission' ),
        ) );

        register_rest_route( 'mitii/v1', '/staff/(?P<staff_id>\d+)/availability', array(
            'methods'             => 'PUT',
            'callback'            => array( __CLASS__, 'set_availability' ),
            'permission_callback' => array( __CLASS__, 'check_admin_permission' ),
        ) );

        register_rest_route( 'mitii/v1', '/staff/(?P<staff_id>\d+)/available-slots', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'get_available_slots_route' ),
            'permission_callback' => '__return_true',
        ) );
    }

    public static function check_admin_permission( WP_REST_Request $request ) {
        if ( ! current_user_can( 'manage_mitii_bookings' ) ) {
            return new WP_Error(
                'rest_forbidden',
                __( 'You do not have permission to manage availability.' ),
                array( 'status' => 403 )
            );
        }

        $nonce = $request->get_header( 'x_mitii_nonce' );
        if ( $nonce && ! wp_verify_nonce( $nonce, 'mitii_bookings_nonce' ) ) {
            return new WP_Error(
                'rest_invalid_nonce',
                __( 'Invalid security token.' ),
                array( 'status' => 403 )
            );
        }

        return true;
    }

    public static function get_availability( WP_REST_Request $request ) {
        global $wpdb;
        $table    = $wpdb->prefix . 'mitii_availability';
        $staff_id = intval( $request['staff_id'] );

        $results = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM $table WHERE staff_id = %d ORDER BY day_of_week, start_time",
                $staff_id
            )
        );

        return rest_ensure_response( $results );
    }

    public static function set_availability( WP_REST_Request $request ) {
        global $wpdb;
        $table    = $wpdb->prefix . 'mitii_availability';
        $staff_id = intval( $request['staff_id'] );
        $slots    = $request->get_json_params();

        $wpdb->delete( $table, array( 'staff_id' => $staff_id ) );

        if ( is_array( $slots ) ) {
            foreach ( $slots as $slot ) {
                $wpdb->insert( $table, array(
                    'staff_id'    => $staff_id,
                    'day_of_week' => intval( $slot['day_of_week'] ),
                    'start_time'  => sanitize_text_field( $slot['start_time'] ),
                    'end_time'    => sanitize_text_field( $slot['end_time'] ),
                ) );
            }
        }

        return rest_ensure_response( array( 'saved' => true ) );
    }

    public static function get_available_slots_route( WP_REST_Request $request ) {
        $date = sanitize_text_field( $request->get_param( 'date' ) );

        // Global holiday check — shop closed for everyone
        if ( $date && Mitii_Holidays_Controller::is_holiday( $date ) ) {
            return rest_ensure_response( array() );
        }

        $staff_id   = intval( $request['staff_id'] );
        $service_id = intval( $request->get_param( 'service_id' ) );

        return rest_ensure_response( self::get_available_slots( $staff_id, $date, $service_id ) );
    }

    public static function get_available_slots( $staff_id, $date, $service_id = 0 ) {
        global $wpdb;

        // Per-staff holiday check
        if ( Mitii_Schedule_Extras_Controller::is_holiday( $staff_id, $date ) ) {
            return array();
        }

        // ── Service metadata ─────────────────────────────────────────────────
        // Fetch duration + padding for the requested service in one query.
        $slot_minutes   = self::SLOT_MINUTES;
        $req_pad_before = 0;
        $req_pad_after  = 0;

        if ( $service_id ) {
            $svc = $wpdb->get_row(
                $wpdb->prepare(
                    "SELECT duration_minutes, padding_before_minutes, padding_after_minutes
                     FROM {$wpdb->prefix}mitii_services
                     WHERE id = %d",
                    $service_id
                )
            );
            if ( $svc ) {
                $slot_minutes   = intval( $svc->duration_minutes );
                $req_pad_before = intval( $svc->padding_before_minutes );
                $req_pad_after  = intval( $svc->padding_after_minutes );
            }
        }

        // ── Working hours + break ranges ─────────────────────────────────────
        $day_of_week = intval( gmdate( 'w', strtotime( $date ) ) );
        $avail_table = $wpdb->prefix . 'mitii_availability';
        $book_table  = $wpdb->prefix . 'mitii_bookings';

        $break_ranges = Mitii_Schedule_Extras_Controller::get_break_ranges( $staff_id, $day_of_week );

        $working_hours = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT start_time, end_time FROM $avail_table WHERE staff_id = %d AND day_of_week = %d",
                $staff_id,
                $day_of_week
            )
        );

        if ( empty( $working_hours ) ) {
            return array();
        }

        // ── Existing bookings → blocked ranges ───────────────────────────────
        // Fetch each booking's service duration + padding so we can compute
        // exactly how long that booking blocks the calendar, including gaps.
        $bookings = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT b.booking_time,
                        COALESCE(s.duration_minutes, 30)       AS duration_minutes,
                        COALESCE(s.padding_before_minutes, 0)  AS padding_before_minutes,
                        COALESCE(s.padding_after_minutes, 0)   AS padding_after_minutes
                 FROM $book_table b
                 LEFT JOIN {$wpdb->prefix}mitii_services s ON b.service_id = s.id
                 WHERE b.staff_id = %d
                   AND b.booking_date = %s
                   AND b.status != 'cancelled'",
                $staff_id,
                $date
            )
        );

        // Each entry: [ blocked_start_mins, blocked_end_mins ]
        $booked_ranges = array();
        foreach ( $bookings as $b ) {
            $start_mins  = self::time_to_minutes( $b->booking_time );
            $duration    = intval( $b->duration_minutes );
            $pad_before  = intval( $b->padding_before_minutes );
            $pad_after   = intval( $b->padding_after_minutes );

            $booked_ranges[] = array(
                $start_mins - $pad_before,
                $start_mins + $duration + $pad_after,
            );
        }

        // ── Generate slots ───────────────────────────────────────────────────
        $slots = array();

        foreach ( $working_hours as $wh ) {
            $start = strtotime( $wh->start_time );
            $end   = strtotime( $wh->end_time );

            while ( ( $start + $slot_minutes * 60 ) <= $end ) {
                $slot_time       = gmdate( 'H:i:s', $start );
                $slot_start_mins = intval( gmdate( 'H', $start ) ) * 60 + intval( gmdate( 'i', $start ) );
                $slot_end_mins   = $slot_start_mins + $slot_minutes;

                // The full calendar block this candidate slot would occupy,
                // including its own padding (before + after).
                $candidate_block_start = $slot_start_mins - $req_pad_before;
                $candidate_block_end   = $slot_end_mins   + $req_pad_after;

                // Skip if this slot's block overlaps any break.
                $in_break = false;
                foreach ( $break_ranges as $range ) {
                    if ( $candidate_block_start < $range[1] && $candidate_block_end > $range[0] ) {
                        $in_break = true;
                        break;
                    }
                }

                // Skip if this slot's block overlaps any existing booking's block.
                $is_booked = false;
                if ( ! $in_break ) {
                    foreach ( $booked_ranges as $range ) {
                        if ( $candidate_block_start < $range[1] && $candidate_block_end > $range[0] ) {
                            $is_booked = true;
                            break;
                        }
                    }
                }

                if ( ! $in_break && ! $is_booked ) {
                    $slots[] = $slot_time;
                }

                $start += $slot_minutes * 60;
            }
        }

        sort( $slots );
        return $slots;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Convert "HH:MM" or "HH:MM:SS" to total minutes since midnight.
     */
    private static function time_to_minutes( $time_str ) {
        $parts = explode( ':', $time_str );
        return intval( $parts[0] ) * 60 + intval( $parts[1] );
    }
}