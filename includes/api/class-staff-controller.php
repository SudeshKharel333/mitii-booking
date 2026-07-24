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

        register_rest_route( 'mitii/v1', '/services/(?P<service_id>\d+)/staff', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'get_staff_by_service' ),
            'permission_callback' => '__return_true',
        ) );
    }

    public static function check_admin_permission() {
        return current_user_can( 'manage_options' );
    }

    // ---- Helper: get the list of service_ids assigned to one staff member ----
    private static function get_service_ids_for_staff( $staff_id ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_staff_services';
        $ids = $wpdb->get_col(
            $wpdb->prepare( "SELECT service_id FROM $table WHERE staff_id = %d", $staff_id )
        );
        return array_map( 'intval', $ids );
    }

    // ---- Helper: replace a staff member's assigned services entirely ----
    private static function set_services_for_staff( $staff_id, $service_ids ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_staff_services';

        // Remove all existing assignments for this staff member first
        $wpdb->delete( $table, array( 'staff_id' => $staff_id ) );

        // Then insert the new set
        foreach ( $service_ids as $service_id ) {
            $wpdb->insert( $table, array(
                'staff_id'   => $staff_id,
                'service_id' => intval( $service_id ),
            ) );
        }
    }

    public static function get_staff( $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_staff';
        $results = $wpdb->get_results( "SELECT * FROM $table ORDER BY id ASC" );

        foreach ( $results as $staff ) {
            $staff->service_ids = self::get_service_ids_for_staff( $staff->id );
        }

        return rest_ensure_response( $results );
    }

    public static function get_staff_by_service( $request ) {
        global $wpdb;
        $staff_table    = $wpdb->prefix . 'mitii_staff';
        $junction_table = $wpdb->prefix . 'mitii_staff_services';

        $service_id = intval( $request['service_id'] );

        $results = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT s.*
                 FROM $staff_table s
                 INNER JOIN $junction_table js ON js.staff_id = s.id
                 WHERE js.service_id = %d
                 ORDER BY s.name ASC",
                $service_id
            )
        );

        foreach ( $results as $staff ) {
            $staff->service_ids = self::get_service_ids_for_staff( $staff->id );
        }

        return rest_ensure_response( $results );
    }

    public static function create_staff( $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_staff';

        $name        = sanitize_text_field( $request['name'] );
        $email       = sanitize_email( $request['email'] );
        $bio         = sanitize_textarea_field( $request['bio'] );
        $service_ids = isset( $request['service_ids'] ) ? (array) $request['service_ids'] : array();

        if ( empty( $name ) ) {
            return new WP_Error( 'missing_name', 'Staff name is required', array( 'status' => 400 ) );
        }

        $wpdb->insert( $table, array(
            'name'  => $name,
            'email' => $email,
            'bio'   => $bio,
        ) );

        $staff_id = $wpdb->insert_id;
        self::set_services_for_staff( $staff_id, $service_ids );

        return rest_ensure_response( array(
            'id'           => $staff_id,
            'name'         => $name,
            'email'        => $email,
            'bio'          => $bio,
            'service_ids'  => array_map( 'intval', $service_ids ),
        ) );
    }

    public static function update_staff( $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_staff';
        $id    = intval( $request['id'] );

        $name        = sanitize_text_field( $request['name'] );
        $email       = sanitize_email( $request['email'] );
        $bio         = sanitize_textarea_field( $request['bio'] );
        $service_ids = isset( $request['service_ids'] ) ? (array) $request['service_ids'] : array();

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

        self::set_services_for_staff( $id, $service_ids );

        return rest_ensure_response( array( 'id' => $id, 'message' => 'Staff member updated' ) );
    }

    public static function delete_staff( $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_staff';
        $junction_table = $wpdb->prefix . 'mitii_staff_services';
        $id    = intval( $request['id'] );

        $deleted = $wpdb->delete( $table, array( 'id' => $id ) );
        $wpdb->delete( $junction_table, array( 'staff_id' => $id ) );

        if ( ! $deleted ) {
            return new WP_Error( 'delete_failed', 'Could not delete staff member', array( 'status' => 500 ) );
        }

        return rest_ensure_response( array( 'id' => $id, 'message' => 'Staff member deleted' ) );
    }
}