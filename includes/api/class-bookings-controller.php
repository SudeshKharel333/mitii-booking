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

        // register_rest_route( 'mitii/v1', '/dashboard/stats', array(
        //     'methods'             => 'GET',
        //     'callback'            => array( __CLASS__, 'get_dashboard_stats' ),
        //     'permission_callback' => array( __CLASS__, 'check_admin_permission' ),
        // ) );
    }

    public static function check_admin_permission() {
        return current_user_can( 'manage_mitii_bookings' );
    }

    public static function check_logged_in() {
        return Mitii_Customer_Session::get_current_customer_id() !== null;
    }

   
    public static function get_bookings( WP_REST_Request $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_bookings';

        $per_page = max( 1, min( 100, intval( $request->get_param( 'per_page' ) ?: 20 ) ) );
        $page     = max( 1, intval( $request->get_param( 'page' ) ?: 1 ) );
        $offset   = ( $page - 1 ) * $per_page;

        $total = intval( $wpdb->get_var( "SELECT COUNT(*) FROM $table" ) );

        $results = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM $table ORDER BY booking_date DESC, booking_time DESC LIMIT %d OFFSET %d",
                $per_page,
                $offset
            )
        );

        $response = rest_ensure_response( $results );
        $response->header( 'X-WP-Total',      $total );
        $response->header( 'X-WP-TotalPages', ceil( $total / $per_page ) );

        return $response;
    }

    /**
     * FIX Bug 4: added full input validation before inserting into DB.
     * Previously, missing or malformed fields were silently inserted as empty/zero values.
     */
    public static function create_booking( WP_REST_Request $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_bookings';

        $service_id     = intval( $request['service_id'] );
        $staff_id       = intval( $request['staff_id'] );
        $customer_name  = sanitize_text_field( $request['customer_name'] );
        $customer_email = sanitize_email( $request['customer_email'] );
        $booking_date   = sanitize_text_field( $request['booking_date'] );
        $booking_time   = sanitize_text_field( $request['booking_time'] );

        // ── Validate required fields ──
        if ( ! $service_id || ! $staff_id ) {
            return new WP_Error( 'missing_ids', 'A valid service and staff member are required.', array( 'status' => 400 ) );
        }
        if ( empty( $customer_name ) ) {
            return new WP_Error( 'missing_name', 'Customer name is required.', array( 'status' => 400 ) );
        }
        if ( ! is_email( $customer_email ) ) {
            return new WP_Error( 'invalid_email', 'A valid email address is required.', array( 'status' => 400 ) );
        }
        if ( ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $booking_date ) ) {
            return new WP_Error( 'invalid_date', 'Date must be in YYYY-MM-DD format.', array( 'status' => 400 ) );
        }
        if ( ! preg_match( '/^\d{2}:\d{2}(:\d{2})?$/', $booking_time ) ) {
            return new WP_Error( 'invalid_time', 'Time must be in HH:MM or HH:MM:SS format.', array( 'status' => 400 ) );
        }

        // ── Verify service and staff actually exist ──
        $service_exists = $wpdb->get_var( $wpdb->prepare(
            "SELECT id FROM {$wpdb->prefix}mitii_services WHERE id = %d", $service_id
        ) );
        if ( ! $service_exists ) {
            return new WP_Error( 'invalid_service', 'The selected service does not exist.', array( 'status' => 400 ) );
        }

        $staff_exists = $wpdb->get_var( $wpdb->prepare(
            "SELECT id FROM {$wpdb->prefix}mitii_staff WHERE id = %d", $staff_id
        ) );
        if ( ! $staff_exists ) {
            return new WP_Error( 'invalid_staff', 'The selected staff member does not exist.', array( 'status' => 400 ) );
        }

        // 🌴 GLOBAL HOLIDAY GUARD — reject bookings on closure days
        if ( Mitii_Holidays_Controller::is_holiday( $booking_date ) ) {
            return new WP_Error(
                'shop_closed',
                'The selected date is a shop closure day. Please choose another date.',
                array( 'status' => 400 )
            );
        }

        // FIX Bug 11: booking_time was never checked against actual
        // availability — not working hours, not existing bookings, not
        // breaks, not the staff member's own holidays. Any client could
        // POST any time and it would be inserted, silently double-booking
        // the staff member. This re-uses the same slot computation the
        // availability endpoint shows the customer, and rejects anything
        // that isn't currently a real open slot.
        $normalized_time = ( strlen( $booking_time ) === 5 ) ? $booking_time . ':00' : $booking_time;
        $available_slots = Mitii_Availability_Controller::get_available_slots( $staff_id, $booking_date, $service_id );
        if ( ! in_array( $normalized_time, $available_slots, true ) ) {
            return new WP_Error(
                'slot_unavailable',
                'That time is no longer available. Please choose another slot.',
                array( 'status' => 409 )
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

    /**
     * FIX Bug 7: this endpoint checked that the requester was logged in as
     * *some* customer, but never verified the booking id actually belonged
     * to them — any logged-in customer could cancel any other customer's
     * booking just by guessing/incrementing the id (IDOR). It now only
     * updates a row that matches both the id and the current customer's
     * own email, and reports 404 if that row doesn't exist.
     */
    public static function cancel_my_booking( WP_REST_Request $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_bookings';
        $id    = intval( $request['id'] );

        $customer_id = Mitii_Customer_Session::get_current_customer_id();
        if ( ! $customer_id ) {
            return new WP_Error( 'not_logged_in', 'You must be logged in.', array( 'status' => 401 ) );
        }

        $booking = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT b.id FROM $table b
                 WHERE b.id = %d
                 AND b.customer_email = (SELECT email FROM {$wpdb->prefix}mitii_customers WHERE id = %d)",
                $id,
                $customer_id
            )
        );

        if ( ! $booking ) {
            return new WP_Error( 'not_found', 'Booking not found.', array( 'status' => 404 ) );
        }

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