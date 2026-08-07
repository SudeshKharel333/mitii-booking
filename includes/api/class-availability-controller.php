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

        // 🌴 GLOBAL HOLIDAY CHECK — shop closed for everyone
        if ( $date && Mitii_Holidays_Controller::is_holiday( $date ) ) {
            return rest_ensure_response( array() );
        }

        $staff_id  = intval( $request['staff_id'] );
        $service_id = intval( $request->get_param( 'service_id' ) );

        return rest_ensure_response( self::get_available_slots( $staff_id, $date, $service_id ) );
    }

   
    public static function get_available_slots( $staff_id, $date, $service_id = 0 ) {
        global $wpdb;

      
        if ( Mitii_Schedule_Extras_Controller::is_holiday( $staff_id, $date ) ) {
            return array();
        }

        // Determine slot duration from the requested service
        $slot_minutes = self::SLOT_MINUTES; // default 30
        if ( $service_id ) {
            $duration = $wpdb->get_var(
                $wpdb->prepare(
                    "SELECT duration_minutes FROM {$wpdb->prefix}mitii_services WHERE id = %d",
                    $service_id
                )
            );
            if ( $duration ) {
                $slot_minutes = intval( $duration );
            }
        }

        $day_of_week = intval( date( 'w', strtotime( $date ) ) );
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

        $bookings = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT booking_time, status FROM $book_table WHERE staff_id = %d AND booking_date = %s AND status != 'cancelled'",
                $staff_id,
                $date
            )
        );

        $booked_times = array();
        foreach ( $bookings as $b ) {
            $booked_times[] = $b->booking_time;
        }

        $slots = array();
        foreach ( $working_hours as $wh ) {
            $start = strtotime( $wh->start_time );
            $end   = strtotime( $wh->end_time );

            while ( ( $start + $slot_minutes * 60 ) <= $end ) {
                $slot_time        = date( 'H:i:s', $start );
                $slot_start_mins  = intval( date( 'H', $start ) ) * 60 + intval( date( 'i', $start ) );
                $slot_end_mins    = $slot_start_mins + $slot_minutes;

                // FIX Bug 10: skip any slot that overlaps a break range.
                $in_break = false;
                foreach ( $break_ranges as $range ) {
                    if ( $slot_start_mins < $range[1] && $slot_end_mins > $range[0] ) {
                        $in_break = true;
                        break;
                    }
                }

                if ( ! $in_break && ! in_array( $slot_time, $booked_times ) ) {
                    $slots[] = $slot_time;
                }
                $start += $slot_minutes * 60;
            }
        }

        sort( $slots );
        return $slots;
    }
}