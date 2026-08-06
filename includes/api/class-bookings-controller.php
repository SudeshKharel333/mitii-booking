<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Mitii_Bookings_Controller {

    public static function register_routes() {
        register_rest_route( 'mitii/v1', '/bookings', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'get_bookings' ),
            'permission_callback' => function( WP_REST_Request $request ) {
                if ( ! current_user_can( 'manage_mitii_bookings' ) ) {
                    return new WP_Error(
                        'rest_forbidden',
                        __( 'You do not have permission to view bookings.' ),
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

        register_rest_route( 'mitii/v1', '/bookings/(?P<id>\d+)/status', array(
            'methods'             => 'PUT',
            'callback'            => array( __CLASS__, 'update_booking_status' ),
            'permission_callback' => array( __CLASS__, 'check_admin_permission' ),
        ) );

        register_rest_route( 'mitii/v1', '/dashboard/stats', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'get_dashboard_stats' ),
            'permission_callback' => array( __CLASS__, 'check_admin_permission' ),
        ) );
    }

    public static function check_admin_permission() {
        return current_user_can( 'manage_mitii_bookings' );
    }

    public static function check_logged_in() {
        return Mitii_Customer_Session::get_current_customer_id() !== null;
    }

    public static function get_bookings() {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_bookings';
        $results = $wpdb->get_results( "SELECT * FROM $table ORDER BY booking_date DESC, booking_time DESC" );
        return rest_ensure_response( $results );
    }

    public static function create_booking( WP_REST_Request $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_bookings';

        $service_id     = intval( $request['service_id'] );
        $staff_id       = intval( $request['staff_id'] );
        $customer_name  = sanitize_text_field( $request['customer_name'] );
        $customer_email = sanitize_email( $request['customer_email'] );
        $booking_date   = sanitize_text_field( $request['booking_date'] );
        $booking_time   = sanitize_text_field( $request['booking_time'] );

        // 🌴 GLOBAL HOLIDAY GUARD — reject bookings on closure days
        if ( Mitii_Holidays_Controller::is_holiday( $booking_date ) ) {
            return new WP_Error(
                'shop_closed',
                'The selected date is a shop closure day. Please choose another date.',
                array( 'status' => 400 )
            );
        }

        $wpdb->insert( $table, array(
            'service_id'     => $service_id,
            'staff_id'       => $staff_id,
            'customer_name'  => $customer_name,
            'customer_email' => $customer_email,
            'booking_date'   => $booking_date,
            'booking_time'   => $booking_time,
            'status'         => 'pending',
        ) );

        return rest_ensure_response( array(
            'id'      => $wpdb->insert_id,
            'message' => 'Booking created successfully.',
        ) );
    }

    public static function get_my_bookings() {
        global $wpdb;
        $table       = $wpdb->prefix . 'mitii_bookings';
        $customer_id = Mitii_Customer_Session::get_current_customer_id();

        if ( ! $customer_id ) {
            return new WP_Error( 'not_logged_in', 'You must be logged in.', array( 'status' => 401 ) );
        }

        $results = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT b.*, s.name as service_name, s.price as service_price, st.name as staff_name
                 FROM $table b
                 LEFT JOIN {$wpdb->prefix}mitii_services s ON b.service_id = s.id
                 LEFT JOIN {$wpdb->prefix}mitii_staff st ON b.staff_id = st.id
                 WHERE b.customer_email = (SELECT email FROM {$wpdb->prefix}mitii_customers WHERE id = %d)
                 ORDER BY b.booking_date DESC, b.booking_time DESC",
                $customer_id
            )
        );

        return rest_ensure_response( $results );
    }

    public static function cancel_my_booking( WP_REST_Request $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_bookings';
        $id    = intval( $request['id'] );

        $wpdb->update(
            $table,
            array( 'status' => 'cancelled' ),
            array( 'id' => $id )
        );

        return rest_ensure_response( array( 'cancelled' => true ) );
    }

    public static function update_booking_status( WP_REST_Request $request ) {
        global $wpdb;
        $table  = $wpdb->prefix . 'mitii_bookings';
        $id     = intval( $request['id'] );
        $status = sanitize_text_field( $request['status'] );

        $allowed = array( 'pending', 'completed', 'cancelled' );
        if ( ! in_array( $status, $allowed ) ) {
            return new WP_Error( 'invalid_status', 'Invalid status value.', array( 'status' => 400 ) );
        }

        $wpdb->update(
            $table,
            array( 'status' => $status ),
            array( 'id' => $id )
        );

        return rest_ensure_response( array( 'updated' => true ) );
    }

    public static function get_dashboard_stats() {
        global $wpdb;
        $bookings_table = $wpdb->prefix . 'mitii_bookings';
        $services_table = $wpdb->prefix . 'mitii_services';
        $staff_table    = $wpdb->prefix . 'mitii_staff';

        $total_bookings   = $wpdb->get_var( "SELECT COUNT(*) FROM $bookings_table" );
        $pending_bookings = $wpdb->get_var( "SELECT COUNT(*) FROM $bookings_table WHERE status = 'pending'" );
        $total_revenue    = $wpdb->get_var( "SELECT SUM(s.price) FROM $bookings_table b JOIN $services_table s ON b.service_id = s.id WHERE b.status != 'cancelled'" );
        $total_services   = $wpdb->get_var( "SELECT COUNT(*) FROM $services_table" );
        $total_staff      = $wpdb->get_var( "SELECT COUNT(*) FROM $staff_table" );

        return rest_ensure_response( array(
            'total_bookings'   => intval( $total_bookings ),
            'pending_bookings' => intval( $pending_bookings ),
            'total_revenue'    => floatval( $total_revenue ?: 0 ),
            'total_services'   => intval( $total_services ),
            'total_staff'      => intval( $total_staff ),
        ) );
    }
}