<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Mitii_Bookings_Controller {

    public static function register_routes() {
        register_rest_route( 'mitii/v1', '/bookings', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'get_bookings' ),
            'permission_callback' => function() {
                return current_user_can( 'manage_options' );
            },
        ) );

        register_rest_route( 'mitii/v1', '/bookings', array(
            'methods'             => 'POST',
            'callback'            => array( __CLASS__, 'create_booking' ),
            'permission_callback' => '__return_true',
        ) );
    }

    public static function get_bookings( $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_bookings';
        $results = $wpdb->get_results( "SELECT * FROM $table ORDER BY id DESC" );
        return rest_ensure_response( $results );
    }

    public static function create_booking( $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_bookings';

        $service_id     = intval( $request['service_id'] );
        $staff_id       = intval( $request['staff_id'] );
        $customer_name  = sanitize_text_field( $request['customer_name'] );
        $customer_email = sanitize_email( $request['customer_email'] );
        $booking_date   = sanitize_text_field( $request['booking_date'] );
        $booking_time   = sanitize_text_field( $request['booking_time'] );

        if ( empty( $customer_name ) || empty( $customer_email ) || empty( $booking_date ) || empty( $booking_time ) ) {
            return new WP_Error( 'missing_fields', 'Please fill in all required fields', array( 'status' => 400 ) );
        }

        if ( ! is_email( $customer_email ) ) {
            return new WP_Error( 'invalid_email', 'Please enter a valid email address', array( 'status' => 400 ) );
        }

        $wpdb->insert( $table, array(
            'service_id'      => $service_id,
            'staff_id'        => $staff_id,
            'customer_name'   => $customer_name,
            'customer_email'  => $customer_email,
            'booking_date'    => $booking_date,
            'booking_time'    => $booking_time,
            'status'          => 'pending',
        ) );

        return rest_ensure_response( array(
            'id'      => $wpdb->insert_id,
            'message' => 'Booking created successfully',
        ) );
    }
}