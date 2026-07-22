<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Mitii_Staff_Controller {

    public static function register_routes() {
        register_rest_route( 'mitii/v1', '/staff', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'get_staff' ),
            'permission_callback' => '__return_true',
        ) );

        register_rest_route( 'mitii/v1', '/staff', array(
            'methods'             => 'POST',
            'callback'            => array( __CLASS__, 'create_staff' ),
            'permission_callback' => array( __CLASS__, 'check_admin_permission' ),
        ) );

        register_rest_route( 'mitii/v1', '/staff/(?P<id>\d+)', array(
            'methods'             => 'PUT',
            'callback'            => array( __CLASS__, 'update_staff' ),
            'permission_callback' => array( __CLASS__, 'check_admin_permission' ),
        ) );

        register_rest_route( 'mitii/v1', '/staff/(?P<id>\d+)', array(
            'methods'             => 'DELETE',
            'callback'            => array( __CLASS__, 'delete_staff' ),
            'permission_callback' => array( __CLASS__, 'check_admin_permission' ),
        ) );
    }

    public static function check_admin_permission() {
        return current_user_can( 'manage_options' );
    }

    public static function get_staff( $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_staff';
        $results = $wpdb->get_results( "SELECT * FROM $table ORDER BY id ASC" );
        return rest_ensure_response( $results );
    }

    public static function create_staff( $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_staff';

        $name  = sanitize_text_field( $request['name'] );
        $email = sanitize_email( $request['email'] );
        $bio   = sanitize_textarea_field( $request['bio'] );

        if ( empty( $name ) ) {
            return new WP_Error( 'missing_name', 'Staff name is required', array( 'status' => 400 ) );
        }

        $wpdb->insert( $table, array(
            'name'  => $name,
            'email' => $email,
            'bio'   => $bio,
        ) );

        return rest_ensure_response( array(
            'id'    => $wpdb->insert_id,
            'name'  => $name,
            'email' => $email,
            'bio'   => $bio,
        ) );
    }

    public static function update_staff( $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_staff';
        $id    = intval( $request['id'] );

        $name  = sanitize_text_field( $request['name'] );
        $email = sanitize_email( $request['email'] );
        $bio   = sanitize_textarea_field( $request['bio'] );

        if ( empty( $name ) ) {
            return new WP_Error( 'missing_name', 'Staff name is required', array( 'status' => 400 ) );
        }

        $updated = $wpdb->update(
            $table,
            array( 'name' => $name, 'email' => $email, 'bio' => $bio ),
            array( 'id' => $id )
        );

        if ( $updated === false ) {
            return new WP_Error( 'update_failed', 'Could not update staff member', array( 'status' => 500 ) );
        }

        return rest_ensure_response( array( 'id' => $id, 'message' => 'Staff member updated' ) );
    }

    public static function delete_staff( $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_staff';
        $id    = intval( $request['id'] );

        $deleted = $wpdb->delete( $table, array( 'id' => $id ) );

        if ( ! $deleted ) {
            return new WP_Error( 'delete_failed', 'Could not delete staff member', array( 'status' => 500 ) );
        }

        return rest_ensure_response( array( 'id' => $id, 'message' => 'Staff member deleted' ) );
    }
}