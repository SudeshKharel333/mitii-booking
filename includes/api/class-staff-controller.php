<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Mitii_Staff_Controller {

    public static function register_routes() {
        register_rest_route( 'mitii/v1', '/staff', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'get_staff' ),
            'permission_callback' => '__return_true',
        ) );
    }

    public static function get_staff( $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_staff';
        $results = $wpdb->get_results( "SELECT * FROM $table ORDER BY id ASC" );
        return rest_ensure_response( $results );
    }
}