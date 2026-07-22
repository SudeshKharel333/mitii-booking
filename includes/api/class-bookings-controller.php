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

 register_rest_route( 'mitii/v1', '/my-bookings', array(
        'methods'             => 'GET',
        'callback'            => array( __CLASS__, 'get_my_bookings' ),
        'permission_callback' => array( __CLASS__, 'check_logged_in' ),
    ) );

    register_rest_route( 'mitii/v1', '/my-bookings/(?P<id>\d+)/cancel', array(
        'methods'             => 'POST',
        'callback'            => array( __CLASS__, 'cancel_my_booking' ),
        'permission_callback' => array( __CLASS__, 'check_logged_in' ),
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
public static function check_logged_in() {
    return is_user_logged_in();
}

public static function get_my_bookings( $request ) {
    global $wpdb;
    $table = $wpdb->prefix . 'mitii_bookings';
    $user  = wp_get_current_user();

    $results = $wpdb->get_results(
        $wpdb->prepare( "SELECT * FROM $table WHERE customer_email = %s ORDER BY booking_date DESC, booking_time DESC", $user->user_email )
    );

    return rest_ensure_response( $results );
}

public static function cancel_my_booking( $request ) {
    global $wpdb;
    $table = $wpdb->prefix . 'mitii_bookings';
    $user  = wp_get_current_user();
    $id    = intval( $request['id'] );

    // Confirm this booking actually belongs to the logged-in user before touching it
    $booking = $wpdb->get_row(
        $wpdb->prepare( "SELECT * FROM $table WHERE id = %d", $id )
    );

    if ( ! $booking ) {
        return new WP_Error( 'not_found', 'Booking not found', array( 'status' => 404 ) );
    }

    if ( $booking->customer_email !== $user->user_email ) {
        return new WP_Error( 'forbidden', 'You cannot cancel a booking that is not yours', array( 'status' => 403 ) );
    }

    $wpdb->update( $table, array( 'status' => 'cancelled' ), array( 'id' => $id ) );

    return rest_ensure_response( array( 'id' => $id, 'message' => 'Booking cancelled' ) );
}


}