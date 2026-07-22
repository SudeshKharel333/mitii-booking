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
    }

    public static function register_customer( $request ) {
        $name     = sanitize_text_field( $request['name'] );
        $email    = sanitize_email( $request['email'] );
        $password = $request['password']; // never sanitize passwords — it can corrupt them

        if ( empty( $name ) || empty( $email ) || empty( $password ) ) {
            return new WP_Error( 'missing_fields', 'Name, email, and password are all required', array( 'status' => 400 ) );
        }

        if ( ! is_email( $email ) ) {
            return new WP_Error( 'invalid_email', 'Please enter a valid email address', array( 'status' => 400 ) );
        }

        if ( email_exists( $email ) ) {
            return new WP_Error( 'email_taken', 'An account with this email already exists', array( 'status' => 400 ) );
        }

        if ( strlen( $password ) < 8 ) {
            return new WP_Error( 'weak_password', 'Password must be at least 8 characters', array( 'status' => 400 ) );
        }

        // WordPress needs a username too — generate one from the email
        $username = sanitize_user( current( explode( '@', $email ) ) );
        if ( username_exists( $username ) ) {
            $username .= '_' . wp_rand( 100, 999 );
        }

        $user_id = wp_insert_user( array(
            'user_login' => $username,
            'user_email' => $email,
            'user_pass'  => $password, // wp_insert_user hashes this internally
            'display_name' => $name,
            'first_name' => $name,
            'role'       => 'mitii_customer',
        ) );

        if ( is_wp_error( $user_id ) ) {
            return new WP_Error( 'registration_failed', $user_id->get_error_message(), array( 'status' => 500 ) );
        }

        // Log them in immediately after registering
        wp_set_current_user( $user_id );
        wp_set_auth_cookie( $user_id );

        return rest_ensure_response( array(
            'id'    => $user_id,
            'name'  => $name,
            'email' => $email,
        ) );
    }

    public static function login_customer( $request ) {
        $email    = sanitize_email( $request['email'] );
        $password = $request['password'];

        if ( empty( $email ) || empty( $password ) ) {
            return new WP_Error( 'missing_fields', 'Email and password are required', array( 'status' => 400 ) );
        }

        $user = get_user_by( 'email', $email );
        if ( ! $user ) {
            return new WP_Error( 'invalid_credentials', 'No account found with that email', array( 'status' => 401 ) );
        }

        $signon = wp_signon( array(
            'user_login'    => $user->user_login,
            'user_password' => $password,
            'remember'      => true,
        ) );

        if ( is_wp_error( $signon ) ) {
            return new WP_Error( 'invalid_credentials', 'Incorrect email or password', array( 'status' => 401 ) );
        }

        wp_set_current_user( $signon->ID );

        return rest_ensure_response( array(
            'id'    => $signon->ID,
            'name'  => $signon->display_name,
            'email' => $signon->user_email,
        ) );
    }

    public static function logout_customer( $request ) {
        wp_logout();
        return rest_ensure_response( array( 'message' => 'Logged out' ) );
    }

    public static function get_current_customer( $request ) {
        if ( ! is_user_logged_in() ) {
            return rest_ensure_response( array( 'logged_in' => false ) );
        }

        $user = wp_get_current_user();
        return rest_ensure_response( array(
            'logged_in' => true,
            'id'        => $user->ID,
            'name'      => $user->display_name,
            'email'     => $user->user_email,
        ) );
    }
}