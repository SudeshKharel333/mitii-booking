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

        register_rest_route( 'mitii/v1', '/staff/(?P<staff_id>\d+)/services', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'get_services_by_staff' ),
            'permission_callback' => '__return_true',
        ) );
    }

    public static function check_admin_permission() {
        return current_user_can( 'manage_mitii_bookings' );
    }

    public static function get_services( $request ) {
        global $wpdb;
        $table   = $wpdb->prefix . 'mitii_services';
        $results = $wpdb->get_results( "SELECT * FROM $table ORDER BY id DESC" );

        foreach ( $results as $s ) {
            $s->id                     = intval( $s->id );
            $s->duration_minutes       = intval( $s->duration_minutes );
            $s->padding_before_minutes = intval( $s->padding_before_minutes );
            $s->padding_after_minutes  = intval( $s->padding_after_minutes );
        }

        return rest_ensure_response( $results );
    }

    public static function get_services_by_staff( $request ) {
        global $wpdb;
        $services_table = $wpdb->prefix . 'mitii_services';
        $junction_table = $wpdb->prefix . 'mitii_staff_services';

        $staff_id = intval( $request['staff_id'] );

        $results = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT s.*
                 FROM $services_table s
                 INNER JOIN $junction_table js ON js.service_id = s.id
                 WHERE js.staff_id = %d
                 ORDER BY s.name ASC",
                $staff_id
            )
        );

        foreach ( $results as $s ) {
            $s->id                     = intval( $s->id );
            $s->duration_minutes       = intval( $s->duration_minutes );
            $s->padding_before_minutes = intval( $s->padding_before_minutes );
            $s->padding_after_minutes  = intval( $s->padding_after_minutes );
        }

        return rest_ensure_response( $results );
    }

    public static function create_service( $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_services';

        $name           = sanitize_text_field( $request['name'] );
        $duration       = intval( $request['duration_minutes'] );
        $pad_before     = intval( $request['padding_before_minutes'] ?? 0 );
        $pad_after      = intval( $request['padding_after_minutes']  ?? 0 );
        $price          = floatval( $request['price'] );
        $image_url      = isset( $request['image_url'] ) ? esc_url_raw( $request['image_url'] ) : '';

        if ( empty( $name ) ) {
            return new WP_Error( 'missing_name', 'Service name is required', array( 'status' => 400 ) );
        }

        if ( $duration < 1 ) {
            return new WP_Error( 'invalid_duration', 'Duration must be at least 1 minute', array( 'status' => 400 ) );
        }

        $wpdb->insert( $table, array(
            'name'                   => $name,
            'duration_minutes'       => $duration,
            'padding_before_minutes' => max( 0, $pad_before ),
            'padding_after_minutes'  => max( 0, $pad_after ),
            'price'                  => $price,
            'image_url'              => $image_url,
        ) );

        return rest_ensure_response( array(
            'id'                     => $wpdb->insert_id,
            'name'                   => $name,
            'duration_minutes'       => $duration,
            'padding_before_minutes' => max( 0, $pad_before ),
            'padding_after_minutes'  => max( 0, $pad_after ),
            'price'                  => $price,
            'image_url'              => $image_url,
        ) );
    }

    public static function update_service( $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_services';
        $id    = intval( $request['id'] );

        $name       = sanitize_text_field( $request['name'] );
        $duration   = intval( $request['duration_minutes'] );
        $pad_before = intval( $request['padding_before_minutes'] ?? 0 );
        $pad_after  = intval( $request['padding_after_minutes']  ?? 0 );
        $price      = floatval( $request['price'] );
        $image_url  = isset( $request['image_url'] ) ? esc_url_raw( $request['image_url'] ) : '';

        if ( empty( $name ) ) {
            return new WP_Error( 'missing_name', 'Service name is required', array( 'status' => 400 ) );
        }

        if ( $duration < 1 ) {
            return new WP_Error( 'invalid_duration', 'Duration must be at least 1 minute', array( 'status' => 400 ) );
        }

        $updated = $wpdb->update(
            $table,
            array(
                'name'                   => $name,
                'duration_minutes'       => $duration,
                'padding_before_minutes' => max( 0, $pad_before ),
                'padding_after_minutes'  => max( 0, $pad_after ),
                'price'                  => $price,
                'image_url'              => $image_url,
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