<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Mitii_Services_Controller {

    public static function register_routes() {
        register_rest_route( 'mitii/v1', '/services', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'get_services' ),
            'permission_callback' => '__return_true',
        ) );

        register_rest_route( 'mitii/v1', '/services', array(
            'methods'             => 'POST',
            'callback'            => array( __CLASS__, 'create_service' ),
            'permission_callback' => function() {
                return current_user_can( 'manage_options' );
            },
        ) );
    }

    public static function get_services( $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_services';
        $results = $wpdb->get_results( "SELECT * FROM $table ORDER BY id DESC" );
        return rest_ensure_response( $results );
    }

    public static function create_service( $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_services';

        $name     = sanitize_text_field( $request->get_param( 'name' ) );
        $duration = intval( $request->get_param( 'duration_minutes' ) );
        $price    = floatval( $request->get_param( 'price' ) );

        if ( empty( $name ) ) {
            return new WP_Error( 'missing_name', 'Service name is required', array( 'status' => 400 ) );
        }

        $wpdb->insert( $table, array(
            'name'              => $name,
            'duration_minutes'  => $duration,
            'price'             => $price,
        ) );

        return rest_ensure_response( array(
            'id'      => $wpdb->insert_id,
            'name'    => $name,
            'message' => 'Service created successfully',
        ) );
    }
}