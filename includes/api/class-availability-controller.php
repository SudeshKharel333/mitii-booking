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

    public static function check_admin_permission() {
        return  function( WP_REST_Request $request ) {
            // 1. Check capability
            if ( ! current_user_can( 'manage_mitii_bookings' ) ) {
                return new WP_Error( 
                    'rest_forbidden', 
                    __( 'You do not have permission to view bookings.' ), 
                    array( 'status' => 403 ) 
                );
            }

            // Optional: Standard WP REST automatically checks X-WP-Nonce for cookie auth.
            // But if you are passing a custom nonce in headers (e.g., 'X-Mitii-Nonce'):
            $nonce = $request->get_header( 'x_mitii_nonce' );
            if ( $nonce && ! wp_verify_nonce( $nonce, 'mitii_bookings_nonce' ) ) {
                return new WP_Error( 
                    'rest_invalid_nonce', 
                    __( 'Invalid security token.' ), 
                    array( 'status' => 403 ) 
                );
            }

            return true;
        };
    }

    // ---- Admin: read a staff member's weekly schedule ----
    public static function get_availability( $request ) {
        global $wpdb;
        $table    = $wpdb->prefix . 'mitii_availability';
        $staff_id = intval( $request['staff_id'] );

        $results = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT id, day_of_week, start_time, end_time FROM $table WHERE staff_id = %d ORDER BY day_of_week ASC, start_time ASC",
                $staff_id
            )
        );

        return rest_ensure_response( $results );
    }

    // ---- Admin: replace a staff member's entire weekly schedule ----
    public static function set_availability( $request ) {
        global $wpdb;
        $table    = $wpdb->prefix . 'mitii_availability';
        $staff_id = intval( $request['staff_id'] );

        $rows = isset( $request['availability'] ) ? (array) $request['availability'] : array();

        // Wipe the existing schedule for this staff member, then insert the new one.
        $wpdb->delete( $table, array( 'staff_id' => $staff_id ) );

        foreach ( $rows as $row ) {
            $day_of_week = isset( $row['day_of_week'] ) ? intval( $row['day_of_week'] ) : null;
            $start_time  = isset( $row['start_time'] ) ? sanitize_text_field( $row['start_time'] ) : null;
            $end_time    = isset( $row['end_time'] ) ? sanitize_text_field( $row['end_time'] ) : null;

            if ( $day_of_week === null || ! $start_time || ! $end_time ) {
                continue; // skip incomplete rows rather than failing the whole save
            }

            $wpdb->insert( $table, array(
                'staff_id'    => $staff_id,
                'day_of_week' => $day_of_week,
                'start_time'  => $start_time,
                'end_time'    => $end_time,
            ) );
        }

        return rest_ensure_response( array( 'message' => 'Availability updated' ) );
    }

    // ---- Public: computed, bookable time slots for one staff+date+service ----
    public static function get_available_slots_route( $request ) {
        $staff_id   = intval( $request['staff_id'] );
        $date       = sanitize_text_field( $request->get_param( 'date' ) );
        $service_id = intval( $request->get_param( 'service_id' ) );

        if ( empty( $date ) || empty( $service_id ) ) {
            return new WP_Error( 'missing_params', 'date and service_id are both required', array( 'status' => 400 ) );
        }

        $slots = self::get_available_slots( $staff_id, $date, $service_id );

        return rest_ensure_response( $slots );
    }

    /**
     * Core logic, reused by the route above AND by Mitii_Bookings_Controller
     * before actually saving a new booking (so the same rules apply whether
     * we're just displaying slots or actually committing one).
     *
     * Returns a plain array of 'HH:MM' strings the staff member is free for,
     * given their working hours, the service's duration, and any bookings
     * they already have that day.
     */
    public static function get_available_slots( $staff_id, $date, $service_id ) {
        global $wpdb;

        $duration = self::get_service_duration( $service_id );
        if ( ! $duration ) {
            return array();
        }

        $day_of_week = intval( gmdate( 'w', strtotime( $date ) ) ); // 0 (Sunday) – 6 (Saturday)

        $availability_table = $wpdb->prefix . 'mitii_availability';
        $windows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT start_time, end_time FROM $availability_table WHERE staff_id = %d AND day_of_week = %d",
                $staff_id,
                $day_of_week
            )
        );

        if ( empty( $windows ) ) {
            return array(); // staff doesn't work at all on this day of the week
        }

        // ---- Holiday check: return no slots if this date is a holiday ----
        if ( class_exists( 'Mitii_Schedule_Extras_Controller' ) &&
             Mitii_Schedule_Extras_Controller::is_holiday( $staff_id, $date ) ) {
            return array();
        }

        // ---- Break ranges: slots that overlap a break are excluded ----
        $break_ranges = class_exists( 'Mitii_Schedule_Extras_Controller' )
            ? Mitii_Schedule_Extras_Controller::get_break_ranges( $staff_id, $day_of_week )
            : array();

        $bookings_table = $wpdb->prefix . 'mitii_bookings';
        $services_table = $wpdb->prefix . 'mitii_services';
        $existing = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT b.booking_time, s.duration_minutes
                 FROM $bookings_table b
                 LEFT JOIN $services_table s ON b.service_id = s.id
                 WHERE b.staff_id = %d AND b.booking_date = %s AND b.status != 'cancelled'",
                $staff_id,
                $date
            )
        );

        $busy_ranges = array();
        foreach ( $existing as $booking ) {
            $start = self::time_to_minutes( $booking->booking_time );
            $busy_ranges[] = array( $start, $start + intval( $booking->duration_minutes ) );
        }

        $today       = gmdate( 'Y-m-d' );
        $now_minutes = intval( gmdate( 'H' ) ) * 60 + intval( gmdate( 'i' ) );

        $available = array();

        foreach ( $windows as $window ) {
            $window_start = self::time_to_minutes( $window->start_time );
            $window_end   = self::time_to_minutes( $window->end_time );

            for ( $slot_start = $window_start; $slot_start + $duration <= $window_end; $slot_start += self::SLOT_MINUTES ) {
                $slot_end = $slot_start + $duration;

                // Skip if this slot has already passed today.
                if ( $date === $today && $slot_start <= $now_minutes ) {
                    continue;
                }

                // Skip if this slot overlaps any existing (non-cancelled) booking.
                $conflict = false;
                foreach ( $busy_ranges as $busy ) {
                    if ( $slot_start < $busy[1] && $slot_end > $busy[0] ) {
                        $conflict = true;
                        break;
                    }
                }

                // Skip if this slot overlaps any break time.
                if ( ! $conflict ) {
                    foreach ( $break_ranges as $brk ) {
                        if ( $slot_start < $brk[1] && $slot_end > $brk[0] ) {
                            $conflict = true;
                            break;
                        }
                    }
                }

                if ( ! $conflict ) {
                    $available[] = self::minutes_to_time( $slot_start );
                }
            }
        }

        return $available;
    }

    /** Checks whether one specific 'HH:MM' slot is still available, right now. Used at booking time. */
    public static function is_slot_available( $staff_id, $date, $service_id, $time ) {
        $available = self::get_available_slots( $staff_id, $date, $service_id );
        return in_array( $time, $available, true );
    }

    private static function get_service_duration( $service_id ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_services';
        $duration = $wpdb->get_var(
            $wpdb->prepare( "SELECT duration_minutes FROM $table WHERE id = %d", $service_id )
        );
        return $duration ? intval( $duration ) : 0;
    }

    private static function time_to_minutes( $time_str ) {
        // Accepts 'HH:MM' or 'HH:MM:SS'
        $parts = explode( ':', $time_str );
        return intval( $parts[0] ) * 60 + intval( $parts[1] );
    }

    private static function minutes_to_time( $minutes ) {
        $hours   = str_pad( (string) intdiv( $minutes, 60 ), 2, '0', STR_PAD_LEFT );
        $minutes = str_pad( (string) ( $minutes % 60 ), 2, '0', STR_PAD_LEFT );
        return "{$hours}:{$minutes}";
    }
}