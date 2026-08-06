<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Admin-side customer management — separate from class-customer-auth-controller.php,
 * which only handles a logged-in customer managing their own account. This
 * controller is for the admin (client) to view all customers and manually
 * add one (e.g. for a booking taken over the phone).
 */
class Mitii_Customers_Admin_Controller {

    public static function register_routes() {
        register_rest_route( 'mitii/v1', '/customers', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'get_customers' ),
            'permission_callback' => array( __CLASS__, 'check_admin_permission' ),
        ) );

        register_rest_route( 'mitii/v1', '/customers', array(
            'methods'             => 'POST',
            'callback'            => array( __CLASS__, 'create_customer' ),
            'permission_callback' => array( __CLASS__, 'check_admin_permission' ),
        ) );

        register_rest_route( 'mitii/v1', '/customers/(?P<id>\d+)', array(
            'methods'             => 'DELETE',
            'callback'            => array( __CLASS__, 'delete_customer' ),
            'permission_callback' => array( __CLASS__, 'check_admin_permission' ),
        ) );
    }

    public static function check_admin_permission() {
        return current_user_can( 'manage_mitii_bookings' );
    }

    public static function get_customers( $request ) {
        global $wpdb;
        $customers_table = $wpdb->prefix . 'mitii_customers';
        $bookings_table  = $wpdb->prefix . 'mitii_bookings';
        $services_table  = $wpdb->prefix . 'mitii_services';

        $page     = max( 1, intval( $request->get_param( 'page' ) ) ?: 1 );
        $per_page = intval( $request->get_param( 'per_page' ) ) ?: 20;
        $per_page = min( 100, max( 1, $per_page ) );
        $offset   = ( $page - 1 ) * $per_page;

        $search = sanitize_text_field( $request->get_param( 'search' ) ?: '' );

        $where  = '';
        $params = array();
        if ( ! empty( $search ) ) {
            $where    = 'WHERE c.name LIKE %s OR c.email LIKE %s';
            $like     = '%' . $wpdb->esc_like( $search ) . '%';
            $params[] = $like;
            $params[] = $like;
        }

        $count_sql = "SELECT COUNT(*) FROM $customers_table c $where";
        $total     = $params
            ? intval( $wpdb->get_var( $wpdb->prepare( $count_sql, $params ) ) )
            : intval( $wpdb->get_var( $count_sql ) );

        $list_sql = "SELECT c.id, c.name, c.email, c.created_at,
                        COUNT(b.id) AS booking_count,
                        COALESCE( SUM( CASE WHEN b.status = 'completed' THEN s.price ELSE 0 END ), 0 ) AS total_spent
                     FROM $customers_table c
                     LEFT JOIN $bookings_table b ON b.customer_email = c.email
                     LEFT JOIN $services_table s ON s.id = b.service_id
                     $where
                     GROUP BY c.id
                     ORDER BY c.created_at DESC
                     LIMIT %d OFFSET %d";

        $list_params   = $params;
        $list_params[] = $per_page;
        $list_params[] = $offset;

        $results = $wpdb->get_results( $wpdb->prepare( $list_sql, $list_params ) );

        $response = rest_ensure_response( $results );
        $response->header( 'X-WP-Total', $total );
        $response->header( 'X-WP-TotalPages', (int) ceil( $total / $per_page ) );

        return $response;
    }

    public static function create_customer( $request ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_customers';

        $name  = sanitize_text_field( $request['name'] );
        $email = sanitize_email( strtolower( trim( $request['email'] ) ) );

        if ( empty( $name ) || empty( $email ) ) {
            return new WP_Error( 'missing_fields', 'Name and email are both required', array( 'status' => 400 ) );
        }

        if ( ! is_email( $email ) ) {
            return new WP_Error( 'invalid_email', 'Please enter a valid email address', array( 'status' => 400 ) );
        }

        $existing = $wpdb->get_row( $wpdb->prepare( "SELECT id FROM $table WHERE email = %s", $email ) );
        if ( $existing ) {
            return new WP_Error( 'email_taken', 'A customer with this email already exists', array( 'status' => 400 ) );
        }

        // There's no "forgot password" flow in this plugin, so a password
        // set here (or generated here) is the only way the customer gets
        // one — hand it back in the response so the admin can share it.
        $password = isset( $request['password'] ) && ! empty( $request['password'] )
            ? (string) $request['password']
            : wp_generate_password( 12, false );

        if ( strlen( $password ) < 8 ) {
            return new WP_Error( 'weak_password', 'Password must be at least 8 characters', array( 'status' => 400 ) );
        }

        $wpdb->insert( $table, array(
            'name'          => $name,
            'email'         => $email,
            'password_hash' => wp_hash_password( $password ),
        ) );

        return rest_ensure_response( array(
            'id'       => $wpdb->insert_id,
            'name'     => $name,
            'email'    => $email,
            'password' => $password,
            'message'  => 'Customer added.',
        ) );
    }

    public static function delete_customer( $request ) {
        global $wpdb;
        $table          = $wpdb->prefix . 'mitii_customers';
        $sessions_table = $wpdb->prefix . 'mitii_customer_sessions';
        $id             = intval( $request['id'] );

        $customer = $wpdb->get_row( $wpdb->prepare( "SELECT id FROM $table WHERE id = %d", $id ) );
        if ( ! $customer ) {
            return new WP_Error( 'not_found', 'Customer not found', array( 'status' => 404 ) );
        }

        // Booking history stays intact (tied to email, not this row) — only
        // the account and its sessions are removed, same as self-deletion.
        $wpdb->delete( $sessions_table, array( 'customer_id' => $id ) );
        $wpdb->delete( $table, array( 'id' => $id ) );

        return rest_ensure_response( array( 'message' => 'Customer deleted' ) );
    }
}