<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Mitii_Holidays_Controller {

    public static function register_routes() {
        register_rest_route( 'mitii/v1', '/holidays', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'get_holidays' ),
            'permission_callback' => array( __CLASS__, 'check_admin_permission' ),
        ) );

        register_rest_route( 'mitii/v1', '/holidays', array(
            'methods'             => 'POST',
            'callback'            => array( __CLASS__, 'create_holiday' ),
            'permission_callback' => array( __CLASS__, 'check_admin_permission' ),
        ) );

        register_rest_route( 'mitii/v1', '/holidays/(?P<id>\d+)', array(
            'methods'             => 'DELETE',
            'callback'            => array( __CLASS__, 'delete_holiday' ),
            'permission_callback' => array( __CLASS__, 'check_admin_permission' ),
        ) );

        // Public endpoint — used by booking widget to block dates
        register_rest_route( 'mitii/v1', '/holidays/public', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'get_holidays_public' ),
            'permission_callback' => '__return_true',
        ) );
    }

    public static function check_admin_permission() {
        return current_user_can( 'manage_mitii_bookings' );
    }

    public static function get_holidays() {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_holidays';
        $results = $wpdb->get_results(
            "SELECT id, holiday_date, name, created_at FROM $table ORDER BY holiday_date ASC"
        );
        return rest_ensure_response( $results );
    }

    public static function get_holidays_public() {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_holidays';
        $results = $wpdb->get_results(
            "SELECT holiday_date, name FROM $table WHERE holiday_date >= CURDATE() ORDER BY holiday_date ASC"
        );
        return rest_ensure_response( $results );
    }

    public static function create_holiday( $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_holidays';

        $date = sanitize_text_field( $request['holiday_date'] );
        $name = sanitize_text_field( $request['name'] ?? '' );

        if ( ! $date || ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date ) ) {
            return new WP_Error(
                'invalid_date',
                'Please provide a valid date in YYYY-MM-DD format.',
                array( 'status' => 400 )
            );
        }

        // Prevent duplicates
        $exists = $wpdb->get_var( $wpdb->prepare(
            "SELECT id FROM $table WHERE holiday_date = %s",
            $date
        ) );
        if ( $exists ) {
            return new WP_Error(
                'duplicate_date',
                'This date is already marked as a holiday.',
                array( 'status' => 409 )
            );
        }

        $wpdb->insert( $table, array(
            'holiday_date' => $date,
            'name'         => $name,
        ) );

        return rest_ensure_response( array(
            'id'           => $wpdb->insert_id,
            'holiday_date' => $date,
            'name'         => $name,
        ) );
    }

    public static function delete_holiday( $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_holidays';
        $id = intval( $request['id'] );

        $wpdb->delete( $table, array( 'id' => $id ) );
        return rest_ensure_response( array( 'deleted' => true ) );
    }

    /**
     * Static helper used by availability and booking controllers.
     * Returns true if the given date is a global holiday.
     */
    public static function is_holiday( $date ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_holidays';
        $count = $wpdb->get_var( $wpdb->prepare(
            "SELECT COUNT(*) FROM $table WHERE holiday_date = %s",
            $date
        ) );
        return intval( $count ) > 0;
    }
}