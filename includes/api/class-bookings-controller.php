<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Mitii_Bookings_Controller {

	public static function register_routes() {
		register_rest_route( 'mitii/v1', '/bookings', array(
			'methods'  => 'GET',
			'callback' => array( __CLASS__, 'get_bookings' ),
			'permission_callback' => function( WP_REST_Request $request ) {
				if ( ! current_user_can( 'manage_options' ) ) {
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
	}

	public static function check_admin_permission() {
		return current_user_can( 'manage_options' );
	}

	public static function get_bookings( $request ) {
		global $wpdb;
		$bookings_table = $wpdb->prefix . 'mitii_bookings';
		$services_table = $wpdb->prefix . 'mitii_services';
		$staff_table    = $wpdb->prefix . 'mitii_staff';

		$page     = max( 1, intval( $request->get_param( 'page' ) ) ?: 1 );
		$per_page = intval( $request->get_param( 'per_page' ) ) ?: 20;
		$per_page = min( 100, max( 1, $per_page ) );
		$offset   = ( $page - 1 ) * $per_page;

		$total = intval( $wpdb->get_var( "SELECT COUNT(*) FROM $bookings_table" ) );

		$results = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT b.*, s.name AS service_name, s.price AS service_price, st.name AS staff_name
				 FROM $bookings_table b
				 LEFT JOIN $services_table s ON b.service_id = s.id
				 LEFT JOIN $staff_table st ON b.staff_id = st.id
				 ORDER BY b.id DESC
				 LIMIT %d OFFSET %d",
				$per_page,
				$offset
			)
		);

		$response = rest_ensure_response( $results );
		$response->header( 'X-WP-Total', $total );
		$response->header( 'X-WP-TotalPages', (int) ceil( $total / $per_page ) );

		return $response;
	}

	public static function create_booking( $request ) {
		global $wpdb;
		$table = $wpdb->prefix . 'mitii_bookings';

		$client_ip = Mitii_Rate_Limiter::get_client_ip();
		if ( ! Mitii_Rate_Limiter::check( 'booking_' . $client_ip, 10, 10 * MINUTE_IN_SECONDS ) ) {
			return new WP_Error(
				'rate_limited',
				'Too many booking attempts. Please wait a few minutes and try again.',
				array( 'status' => 429 )
			);
		}

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

		if ( ! Mitii_Availability_Controller::is_slot_available( $staff_id, $booking_date, $service_id, $booking_time ) ) {
			return new WP_Error( 'slot_unavailable', 'That time is no longer available. Please choose another slot.', array( 'status' => 409 ) );
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

		$booking_id = $wpdb->insert_id;

		return rest_ensure_response( array(
			'id'      => $booking_id,
			'message' => 'Booking created successfully',
		) );
	}

	public static function check_logged_in() {
		return Mitii_Customer_Session::get_current_customer_id() !== null;
	}

	public static function get_my_bookings( $request ) {
		global $wpdb;
		$bookings_table  = $wpdb->prefix . 'mitii_bookings';
		$services_table  = $wpdb->prefix . 'mitii_services';
		$staff_table     = $wpdb->prefix . 'mitii_staff';
		$customers_table = $wpdb->prefix . 'mitii_customers';

		$customer_id = Mitii_Customer_Session::get_current_customer_id();
		$customer    = $wpdb->get_row(
			$wpdb->prepare( "SELECT email FROM $customers_table WHERE id = %d", $customer_id )
		);

		if ( ! $customer ) {
			return new WP_Error( 'not_found', 'Customer not found', array( 'status' => 404 ) );
		}

		$page     = max( 1, intval( $request->get_param( 'page' ) ) ?: 1 );
		$per_page = intval( $request->get_param( 'per_page' ) ) ?: 20;
		$per_page = min( 100, max( 1, $per_page ) );
		$offset   = ( $page - 1 ) * $per_page;

		$total = intval(
			$wpdb->get_var(
				$wpdb->prepare( "SELECT COUNT(*) FROM $bookings_table WHERE customer_email = %s", $customer->email )
			)
		);

		$results = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT b.*, s.name AS service_name, s.price AS service_price, st.name AS staff_name
				 FROM $bookings_table b
				 LEFT JOIN $services_table s ON b.service_id = s.id
				 LEFT JOIN $staff_table st ON b.staff_id = st.id
				 WHERE b.customer_email = %s
				 ORDER BY b.booking_date DESC, b.booking_time DESC
				 LIMIT %d OFFSET %d",
				$customer->email,
				$per_page,
				$offset
			)
		);

		$response = rest_ensure_response( $results );
		$response->header( 'X-WP-Total', $total );
		$response->header( 'X-WP-TotalPages', (int) ceil( $total / $per_page ) );

		return $response;
	}

	public static function cancel_my_booking( $request ) {
		global $wpdb;
		$table          = $wpdb->prefix . 'mitii_bookings';
		$customers_table = $wpdb->prefix . 'mitii_customers';
		$id             = intval( $request['id'] );

		$customer_id = Mitii_Customer_Session::get_current_customer_id();
		$customer    = $wpdb->get_row(
			$wpdb->prepare( "SELECT email FROM $customers_table WHERE id = %d", $customer_id )
		);

		$booking = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table WHERE id = %d", $id ) );

		if ( ! $booking ) {
			return new WP_Error( 'not_found', 'Booking not found', array( 'status' => 404 ) );
		}

		if ( $booking->customer_email !== $customer->email ) {
			return new WP_Error( 'forbidden', 'You cannot cancel a booking that is not yours', array( 'status' => 403 ) );
		}

		$wpdb->update( $table, array( 'status' => 'cancelled' ), array( 'id' => $id ) );

		return rest_ensure_response( array( 'id' => $id, 'message' => 'Booking cancelled' ) );
	}

	public static function update_booking_status( $request ) {
		global $wpdb;
		$table  = $wpdb->prefix . 'mitii_bookings';
		$id     = intval( $request['id'] );
		$status = sanitize_text_field( $request['status'] );

		$allowed_statuses = array( 'pending', 'completed', 'cancelled' );

		if ( ! in_array( $status, $allowed_statuses, true ) ) {
			return new WP_Error(
				'invalid_status',
				'Status must be one of: ' . implode( ', ', $allowed_statuses ),
				array( 'status' => 400 )
			);
		}

		$booking = $wpdb->get_row( $wpdb->prepare( "SELECT id FROM $table WHERE id = %d", $id ) );
		if ( ! $booking ) {
			return new WP_Error( 'not_found', 'Booking not found', array( 'status' => 404 ) );
		}

		$wpdb->update( $table, array( 'status' => $status ), array( 'id' => $id ) );

		return rest_ensure_response( array( 'id' => $id, 'status' => $status, 'message' => 'Booking status updated' ) );
	}
}