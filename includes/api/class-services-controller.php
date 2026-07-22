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
            'permission_callback' => array( __CLASS__, 'check_admin_permission' ),
        ) );

        register_rest_route( 'mitii/v1', '/services/(?P<id>\d+)', array(
            'methods'             => 'PUT',
            'callback'            => array( __CLASS__, 'update_service' ),
            'permission_callback' => array( __CLASS__, 'check_admin_permission' ),
        ) );

        register_rest_route( 'mitii/v1', '/services/(?P<id>\d+)', array(
            'methods'             => 'DELETE',
            'callback'            => array( __CLASS__, 'delete_service' ),
            'permission_callback' => array( __CLASS__, 'check_admin_permission' ),
        ) );
    }

    public static function check_admin_permission() {
        return current_user_can( 'manage_options' );
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

        $name     = sanitize_text_field( $request['name'] );
        $duration = intval( $request['duration_minutes'] );
        $price    = floatval( $request['price'] );

        if ( empty( $name ) ) {
            return new WP_Error( 'missing_name', 'Service name is required', array( 'status' => 400 ) );
        }

        $wpdb->insert( $table, array(
            'name'             => $name,
            'duration_minutes' => $duration,
            'price'            => $price,
        ) );

        return rest_ensure_response( array(
            'id'                => $wpdb->insert_id,
            'name'              => $name,
            'duration_minutes'  => $duration,
            'price'             => $price,
        ) );
    }

    public static function update_service( $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_services';
        $id    = intval( $request['id'] );

        $name     = sanitize_text_field( $request['name'] );
        $duration = intval( $request['duration_minutes'] );
        $price    = floatval( $request['price'] );

        if ( empty( $name ) ) {
            return new WP_Error( 'missing_name', 'Service name is required', array( 'status' => 400 ) );
        }

        $updated = $wpdb->update(
            $table,
            array(
                'name'             => $name,
                'duration_minutes' => $duration,
                'price'            => $price,
            ),
            array( 'id' => $id )
        );

        if ( $updated === false ) {
            return new WP_Error( 'update_failed', 'Could not update service', array( 'status' => 500 ) );
        }

        return rest_ensure_response( array( 'id' => $id, 'message' => 'Service updated' ) );
    }

    public static function delete_service( $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_services';
        $id    = intval( $request['id'] );

        $deleted = $wpdb->delete( $table, array( 'id' => $id ) );

        if ( ! $deleted ) {
            return new WP_Error( 'delete_failed', 'Could not delete service', array( 'status' => 500 ) );
        }

        return rest_ensure_response( array( 'id' => $id, 'message' => 'Service deleted' ) );
    }
}