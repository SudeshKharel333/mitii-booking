<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * REST API controller for staff break times and holidays.
 *
 * Break times  – repeating daily blocks when a staff member is unavailable (e.g. lunch).
 *                Stored per staff per day_of_week (0-6, or NULL = every working day).
 *
 * Holidays     – specific calendar dates on which a staff member does not work at all.
 */
class Mitii_Schedule_Extras_Controller {

    // -----------------------------------------------------------------------
    // Route registration
    // -----------------------------------------------------------------------

    public static function register_routes() {

        // ---- Break times ----
        register_rest_route( 'mitii/v1', '/staff/(?P<staff_id>\d+)/break-times', array(
            array(
                'methods'             => 'GET',
                'callback'            => array( __CLASS__, 'get_break_times' ),
                'permission_callback' => array( __CLASS__, 'admin_permission' ),
            ),
            array(
                'methods'             => 'POST',
                'callback'            => array( __CLASS__, 'add_break_time' ),
                'permission_callback' => array( __CLASS__, 'admin_permission' ),
            ),
        ) );

        register_rest_route( 'mitii/v1', '/staff/(?P<staff_id>\d+)/break-times/(?P<break_id>\d+)', array(
            array(
                'methods'             => 'PUT',
                'callback'            => array( __CLASS__, 'update_break_time' ),
                'permission_callback' => array( __CLASS__, 'admin_permission' ),
            ),
            array(
                'methods'             => 'DELETE',
                'callback'            => array( __CLASS__, 'delete_break_time' ),
                'permission_callback' => array( __CLASS__, 'admin_permission' ),
            ),
        ) );

        // ---- Holidays ----
        register_rest_route( 'mitii/v1', '/staff/(?P<staff_id>\d+)/holidays', array(
            array(
                'methods'             => 'GET',
                'callback'            => array( __CLASS__, 'get_holidays' ),
                'permission_callback' => array( __CLASS__, 'admin_permission' ),
            ),
            array(
                'methods'             => 'POST',
                'callback'            => array( __CLASS__, 'add_holiday' ),
                'permission_callback' => array( __CLASS__, 'admin_permission' ),
            ),
        ) );

        register_rest_route( 'mitii/v1', '/staff/(?P<staff_id>\d+)/holidays/(?P<holiday_id>\d+)', array(
            array(
                'methods'             => 'DELETE',
                'callback'            => array( __CLASS__, 'delete_holiday' ),
                'permission_callback' => array( __CLASS__, 'admin_permission' ),
            ),
        ) );
    }

    // -----------------------------------------------------------------------
    // Permission
    // -----------------------------------------------------------------------

    public static function admin_permission() {
        if ( ! current_user_can( 'manage_mitii_bookings' ) ) {
            return new WP_Error( 'rest_forbidden', 'You do not have permission.', array( 'status' => 403 ) );
        }
        return true;
    }

    // -----------------------------------------------------------------------
    // Break time handlers
    // -----------------------------------------------------------------------

    /** GET /mitii/v1/staff/{id}/break-times */
    public static function get_break_times( $request ) {
        global $wpdb;
        $staff_id = intval( $request['staff_id'] );
        $table    = $wpdb->prefix . 'mitii_break_times';

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT id, day_of_week, start_time, end_time, label
                 FROM $table
                 WHERE staff_id = %d
                 ORDER BY day_of_week ASC, start_time ASC",
                $staff_id
            )
        );

        return rest_ensure_response( $rows );
    }

    /** POST /mitii/v1/staff/{id}/break-times */
    public static function add_break_time( $request ) {
        global $wpdb;
        $staff_id    = intval( $request['staff_id'] );
        $table       = $wpdb->prefix . 'mitii_break_times';

        $day_of_week = isset( $request['day_of_week'] ) && $request['day_of_week'] !== '' && $request['day_of_week'] !== null
                        ? intval( $request['day_of_week'] )
                        : null;
        $start_time  = sanitize_text_field( $request['start_time'] ?? '' );
        $end_time    = sanitize_text_field( $request['end_time'] ?? '' );
        $label       = sanitize_text_field( $request['label'] ?? 'Break' );

        if ( ! $start_time || ! $end_time ) {
            return new WP_Error( 'missing_params', 'start_time and end_time are required.', array( 'status' => 400 ) );
        }

        if ( $start_time >= $end_time ) {
            return new WP_Error( 'invalid_times', 'start_time must be before end_time.', array( 'status' => 400 ) );
        }

        $result = $wpdb->insert( $table, array(
            'staff_id'    => $staff_id,
            'day_of_week' => $day_of_week,
            'start_time'  => $start_time,
            'end_time'    => $end_time,
            'label'       => $label,
        ) );

        if ( $result === false ) {
            return new WP_Error( 'db_error', 'Could not save break time.', array( 'status' => 500 ) );
        }

        return rest_ensure_response( array(
            'id'          => $wpdb->insert_id,
            'staff_id'    => $staff_id,
            'day_of_week' => $day_of_week,
            'start_time'  => $start_time,
            'end_time'    => $end_time,
            'label'       => $label,
        ) );
    }

    public static function update_break_time( $request ) {
        global $wpdb;
        $staff_id    = intval( $request['staff_id'] );
        $break_id    = intval( $request['break_id'] );
        $table       = $wpdb->prefix . 'mitii_break_times';

        $day_of_week = isset( $request['day_of_week'] ) && $request['day_of_week'] !== '' && $request['day_of_week'] !== null
                        ? intval( $request['day_of_week'] )
                        : null;
        $start_time  = sanitize_text_field( $request['start_time'] ?? '' );
        $end_time    = sanitize_text_field( $request['end_time'] ?? '' );
        $label       = sanitize_text_field( $request['label'] ?? 'Break' );

        if ( ! $start_time || ! $end_time ) {
            return new WP_Error( 'missing_params', 'start_time and end_time are required.', array( 'status' => 400 ) );
        }

        $wpdb->update(
            $table,
            array(
                'day_of_week' => $day_of_week,
                'start_time'  => $start_time,
                'end_time'    => $end_time,
                'label'       => $label,
            ),
            array( 'id' => $break_id, 'staff_id' => $staff_id )
        );

        return rest_ensure_response( array( 'message' => 'Break time updated.' ) );
    }

    /** DELETE /mitii/v1/staff/{id}/break-times/{break_id} */
    public static function delete_break_time( $request ) {
        global $wpdb;
        $table    = $wpdb->prefix . 'mitii_break_times';
        $break_id = intval( $request['break_id'] );
        $staff_id = intval( $request['staff_id'] );

        $wpdb->delete( $table, array( 'id' => $break_id, 'staff_id' => $staff_id ) );

        return rest_ensure_response( array( 'message' => 'Break time deleted.' ) );
    }

    // -----------------------------------------------------------------------
    // Holiday handlers
    // -----------------------------------------------------------------------

    /** GET /mitii/v1/staff/{id}/holidays */
    public static function get_holidays( $request ) {
        global $wpdb;
        $staff_id = intval( $request['staff_id'] );
       
        $table    = $wpdb->prefix . 'mitii_staff_holidays';

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT id, holiday_date, label
                 FROM $table
                 WHERE staff_id = %d
                 ORDER BY holiday_date ASC",
                $staff_id
            )
        );

        return rest_ensure_response( $rows );
    }

    /** POST /mitii/v1/staff/{id}/holidays */
    public static function add_holiday( $request ) {
        global $wpdb;
        $staff_id     = intval( $request['staff_id'] );
        $table        = $wpdb->prefix . 'mitii_staff_holidays'; 
        $holiday_date = sanitize_text_field( $request['holiday_date'] ?? '' );
        $label        = sanitize_text_field( $request['label'] ?? 'Holiday' );

        if ( ! $holiday_date || ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $holiday_date ) ) {
            return new WP_Error( 'invalid_date', 'holiday_date must be YYYY-MM-DD.', array( 'status' => 400 ) );
        }

        // Prevent duplicate dates for this staff member.
        $exists = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT id FROM $table WHERE staff_id = %d AND holiday_date = %s",
                $staff_id,
                $holiday_date
            )
        );

        if ( $exists ) {
            return new WP_Error( 'duplicate', 'This date is already marked as a holiday.', array( 'status' => 409 ) );
        }

        $result = $wpdb->insert( $table, array(
            'staff_id'     => $staff_id,
            'holiday_date' => $holiday_date,
            'label'        => $label,
        ) );

        if ( $result === false ) {
            return new WP_Error( 'db_error', 'Could not save holiday.', array( 'status' => 500 ) );
        }

        return rest_ensure_response( array(
            'id'           => $wpdb->insert_id,
            'staff_id'     => $staff_id,
            'holiday_date' => $holiday_date,
            'label'        => $label,
        ) );
    }

    /** DELETE /mitii/v1/staff/{id}/holidays/{holiday_id} */
    public static function delete_holiday( $request ) {
        global $wpdb;
        $table      = $wpdb->prefix . 'mitii_staff_holidays'; 
        $holiday_id = intval( $request['holiday_id'] );
        $staff_id   = intval( $request['staff_id'] );

        $wpdb->delete( $table, array( 'id' => $holiday_id, 'staff_id' => $staff_id ) );

        return rest_ensure_response( array( 'message' => 'Holiday deleted.' ) );
    }

    // -----------------------------------------------------------------------
    // Static helper reused by Mitii_Availability_Controller
    // -----------------------------------------------------------------------

    /**
     * Returns true if $date is a holiday for the given staff member.
     */
    public static function is_holiday( $staff_id, $date ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_staff_holidays'; 
        $count = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM $table WHERE staff_id = %d AND holiday_date = %s",
                intval( $staff_id ),
                $date
            )
        );
        return intval( $count ) > 0;
    }

    /**
     * Returns an array of break ranges (each a [start_minutes, end_minutes] pair)
     * applicable to the given staff member on $day_of_week (0-6).
     * Includes both day-specific breaks and "every day" breaks (day_of_week IS NULL).
     */
    public static function get_break_ranges( $staff_id, $day_of_week ) {
        global $wpdb;
        $table  = $wpdb->prefix . 'mitii_break_times';
        $breaks = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT start_time, end_time FROM $table
                 WHERE staff_id = %d AND (day_of_week = %d OR day_of_week IS NULL)",
                intval( $staff_id ),
                intval( $day_of_week )
            )
        );

        $ranges = array();
        foreach ( $breaks as $b ) {
            $start    = self::time_to_minutes( $b->start_time );
            $end      = self::time_to_minutes( $b->end_time );
            $ranges[] = array( $start, $end );
        }
        return $ranges;
    }

    private static function time_to_minutes( $time_str ) {
        $parts = explode( ':', $time_str );
        return intval( $parts[0] ) * 60 + intval( $parts[1] );
    }
}