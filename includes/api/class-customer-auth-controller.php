<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Mitii_Customer_Auth_Controller {

    public static function register_routes() {
        register_rest_route( 'mitii/v1', '/customer/register', array(
            'methods'             => 'POST',
            'callback'            => array( __CLASS__, 'register_customer' ),
            'permission_callback' => '__return_true',
        ) );

        register_rest_route( 'mitii/v1', '/customer/login', array(
            'methods'             => 'POST',
            'callback'            => array( __CLASS__, 'login_customer' ),
            'permission_callback' => '__return_true',
        ) );

        register_rest_route( 'mitii/v1', '/customer/logout', array(
            'methods'             => 'POST',
            'callback'            => array( __CLASS__, 'logout_customer' ),
            'permission_callback' => '__return_true',
        ) );

        register_rest_route( 'mitii/v1', '/customer/me', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'get_current_customer' ),
            'permission_callback' => '__return_true',
        ) );
        register_rest_route( 'mitii/v1', '/customer/me', array(
			'methods'             => 'GET',
			'callback'            => array( __CLASS__, 'get_current_customer' ),
			'permission_callback' => '__return_true',
		) );

		// NEW: Update profile
		register_rest_route( 'mitii/v1', '/customer/me', array(
			'methods'             => 'PUT',
			'callback'            => array( __CLASS__, 'update_customer' ),
			'permission_callback' => array( __CLASS__, 'check_logged_in' ),
		) );

		// NEW: Delete account
		register_rest_route( 'mitii/v1', '/customer/me', array(
			'methods'             => 'DELETE',
			'callback'            => array( __CLASS__, 'delete_customer' ),
			'permission_callback' => array( __CLASS__, 'check_logged_in' ),
		) );
    }

    public static function register_customer( $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_customers';

        $client_ip = Mitii_Rate_Limiter::get_client_ip();
        if ( ! Mitii_Rate_Limiter::check( 'register_' . $client_ip, 5, HOUR_IN_SECONDS ) ) {
            return new WP_Error(
                'rate_limited',
                'Too many registration attempts. Please try again later.',
                array( 'status' => 429 )
            );
        }

        $name     = sanitize_text_field( $request['name'] );
        $email = sanitize_email( strtolower( trim( $request['email'] ) ) );        $password = $request['password'];

        if ( empty( $name ) || empty( $email ) || empty( $password ) ) {
            return new WP_Error( 'missing_fields', 'Name, email, and password are all required', array( 'status' => 400 ) );
        }

        if ( ! is_email( $email ) ) {
            return new WP_Error( 'invalid_email', 'Please enter a valid email address', array( 'status' => 400 ) );
        }

        if ( strlen( $password ) < 8 ) {
            return new WP_Error( 'weak_password', 'Password must be at least 8 characters', array( 'status' => 400 ) );
        }

        $existing = $wpdb->get_row(
            $wpdb->prepare( "SELECT id FROM $table WHERE email = %s", $email )
        );
        if ( $existing ) {
            return new WP_Error( 'email_taken', 'An account with this email already exists', array( 'status' => 400 ) );
        }

        $password_hash = wp_hash_password( $password );

        $wpdb->insert( $table, array(
            'name'          => $name,
            'email'         => $email,
            'password_hash' => $password_hash,
        ) );

        $customer_id = $wpdb->insert_id;
        Mitii_Customer_Session::create_session( $customer_id );

        return rest_ensure_response( array(
            'id'    => $customer_id,
            'name'  => $name,
            'email' => $email,
        ) );
    }

    public static function login_customer( $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_customers';

        $client_ip = Mitii_Rate_Limiter::get_client_ip();
        if ( ! Mitii_Rate_Limiter::check( 'login_' . $client_ip, 5, 5 * MINUTE_IN_SECONDS ) ) {
            return new WP_Error(
                'rate_limited',
                'Too many login attempts. Please wait a few minutes and try again.',
                array( 'status' => 429 )
            );
        }

        $email = sanitize_email( strtolower( trim( $request['email'] ) ) );        $password = $request['password'];

        if ( empty( $email ) || empty( $password ) ) {
            return new WP_Error( 'missing_fields', 'Email and password are required', array( 'status' => 400 ) );
        }

        $customer = $wpdb->get_row(
            $wpdb->prepare( "SELECT * FROM $table WHERE email = %s", $email )
        );

        if ( ! $customer || ! wp_check_password( $password, $customer->password_hash ) ) {
            return new WP_Error( 'invalid_credentials', 'Incorrect email or password', array( 'status' => 401 ) );
        }

        Mitii_Customer_Session::create_session( $customer->id );

        return rest_ensure_response( array(
            'id'    => $customer->id,
            'name'  => $customer->name,
            'email' => $customer->email,
        ) );
    }

    public static function logout_customer( $request ) {
        Mitii_Customer_Session::destroy_session();
        return rest_ensure_response( array( 'message' => 'Logged out' ) );
    }

    public static function get_current_customer( $request ) {
        $customer_id = Mitii_Customer_Session::get_current_customer_id();

        if ( ! $customer_id ) {
            return rest_ensure_response( array( 'logged_in' => false ) );
        }

        global $wpdb;
        $table = $wpdb->prefix . 'mitii_customers';
        $customer = $wpdb->get_row(
            $wpdb->prepare( "SELECT id, name, email FROM $table WHERE id = %d", $customer_id )
        );

        if ( ! $customer ) {
            return rest_ensure_response( array( 'logged_in' => false ) );
        }

        return rest_ensure_response( array(
            'logged_in' => true,
            'id'        => $customer->id,
            'name'      => $customer->name,
            'email'     => $customer->email,
        ) );
    }
    
	/**
	 * Update current customer's profile.
	 */
	public static function update_customer( $request ) {
		global $wpdb;
		$table       = $wpdb->prefix . 'mitii_customers';
		$customer_id = Mitii_Customer_Session::get_current_customer_id();

		$name     = isset( $request['name'] ) ? sanitize_text_field( $request['name'] ) : null;
		$email    = isset( $request['email'] ) ? sanitize_email( strtolower( trim( $request['email'] ) ) ) : null;
		$password = isset( $request['password'] ) ? $request['password'] : null;

		$current = $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM $table WHERE id = %d", $customer_id )
		);

		if ( ! $current ) {
			return new WP_Error( 'not_found', 'Customer not found', array( 'status' => 404 ) );
		}

		$update_data = array();

		if ( ! empty( $name ) ) {
			$update_data['name'] = $name;
		}

		if ( ! empty( $email ) && $email !== $current->email ) {
			if ( ! is_email( $email ) ) {
				return new WP_Error( 'invalid_email', 'Please enter a valid email address', array( 'status' => 400 ) );
			}

			$existing = $wpdb->get_row(
				$wpdb->prepare( "SELECT id FROM $table WHERE email = %s AND id != %d", $email, $customer_id )
			);
			if ( $existing ) {
				return new WP_Error( 'email_taken', 'An account with this email already exists', array( 'status' => 400 ) );
			}

			$update_data['email'] = $email;
		}

		if ( ! empty( $password ) ) {
			if ( strlen( $password ) < 8 ) {
				return new WP_Error( 'weak_password', 'Password must be at least 8 characters', array( 'status' => 400 ) );
			}
			$update_data['password_hash'] = wp_hash_password( $password );
		}

		if ( empty( $update_data ) ) {
			return new WP_Error( 'no_changes', 'No fields to update', array( 'status' => 400 ) );
		}

		$wpdb->update( $table, $update_data, array( 'id' => $customer_id ) );

		return rest_ensure_response( array(
			'id'      => $customer_id,
			'message' => 'Profile updated successfully',
		) );
	}

	/**
	 * Delete current customer's account and all associated data.
	 */
	public static function delete_customer( $request ) {
		global $wpdb;
		$customers_table = $wpdb->prefix . 'mitii_customers';
		$sessions_table  = $wpdb->prefix . 'mitii_customer_sessions';
		$bookings_table  = $wpdb->prefix . 'mitii_bookings';
		$customer_id     = Mitii_Customer_Session::get_current_customer_id();

		// Get customer email to anonymize bookings
		$customer = $wpdb->get_row(
			$wpdb->prepare( "SELECT email FROM $customers_table WHERE id = %d", $customer_id )
		);

		if ( ! $customer ) {
			return new WP_Error( 'not_found', 'Customer not found', array( 'status' => 404 ) );
		}

		// Anonymize past bookings (keep them for records but remove personal link)
		$wpdb->update(
			$bookings_table,
			array( 'customer_email' => 'deleted@account.local' ),
			array( 'customer_email' => $customer->email )
		);

		// Delete all sessions for this customer
		$wpdb->delete( $sessions_table, array( 'customer_id' => $customer_id ) );

		// Delete the customer
		$wpdb->delete( $customers_table, array( 'id' => $customer_id ) );

		// Clear the session cookie
		Mitii_Customer_Session::destroy_session();

		return rest_ensure_response( array(
			'message' => 'Account deleted successfully',
		) );
	}
}