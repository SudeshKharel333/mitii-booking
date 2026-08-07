<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Mitii_Dashboard_Controller {

    public static function register_routes() {

        // FIX: React fetches /dashboard/stats but route was registered as /dashboard only.
        // Registered both so either URL works.
        $args = array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'get_dashboard' ),
            'permission_callback' => array( __CLASS__, 'check_admin_permission' ),
        );

        register_rest_route( 'mitii/v1', '/dashboard',       $args );
        register_rest_route( 'mitii/v1', '/dashboard/stats', $args );
    }

    public static function check_admin_permission() {
        // FIX: was using manage_options (Super Admin only).
        // Use manage_mitii_bookings so the custom capability works.
        return current_user_can( 'manage_mitii_bookings' );
    }

    public static function get_dashboard( WP_REST_Request $request ) {
        global $wpdb;

        $bookings_table  = $wpdb->prefix . 'mitii_bookings';
        $services_table  = $wpdb->prefix . 'mitii_services';
        $staff_table     = $wpdb->prefix . 'mitii_staff';
        $customers_table = $wpdb->prefix . 'mitii_customers';

        $today            = gmdate( 'Y-m-d' );
        $this_month_start = gmdate( 'Y-m-01' );
        $last_month_start = gmdate( 'Y-m-01', strtotime( '-1 month' ) );
        $last_month_end   = gmdate( 'Y-m-t',  strtotime( '-1 month' ) );

        // ── Totals ──────────────────────────────────────────────────────────────
        $total_bookings  = (int)   $wpdb->get_var( "SELECT COUNT(*) FROM $bookings_table" );
        $total_revenue   = (float) $wpdb->get_var( "SELECT COALESCE(SUM(s.price),0) FROM $bookings_table b LEFT JOIN $services_table s ON b.service_id=s.id WHERE b.status!='cancelled'" );
        $total_staff     = (int)   $wpdb->get_var( "SELECT COUNT(*) FROM $staff_table" );
        $total_services  = (int)   $wpdb->get_var( "SELECT COUNT(*) FROM $services_table" );
        $total_customers = (int)   $wpdb->get_var( "SELECT COUNT(*) FROM $customers_table" );

        // ── Today ───────────────────────────────────────────────────────────────
        $today_bookings = (int) $wpdb->get_var( $wpdb->prepare(
            "SELECT COUNT(*) FROM $bookings_table WHERE booking_date=%s AND status!='cancelled'", $today
        ) );
        $today_revenue = (float) $wpdb->get_var( $wpdb->prepare(
            "SELECT COALESCE(SUM(s.price),0) FROM $bookings_table b LEFT JOIN $services_table s ON b.service_id=s.id WHERE b.booking_date=%s AND b.status!='cancelled'", $today
        ) );

        // ── This month ──────────────────────────────────────────────────────────
        $month_bookings = (int) $wpdb->get_var( $wpdb->prepare(
            "SELECT COUNT(*) FROM $bookings_table WHERE booking_date>=%s AND status!='cancelled'", $this_month_start
        ) );
        $month_revenue = (float) $wpdb->get_var( $wpdb->prepare(
            "SELECT COALESCE(SUM(s.price),0) FROM $bookings_table b LEFT JOIN $services_table s ON b.service_id=s.id WHERE b.booking_date>=%s AND b.status!='cancelled'", $this_month_start
        ) );

        // ── Last month ──────────────────────────────────────────────────────────
        $last_month_bookings = (int) $wpdb->get_var( $wpdb->prepare(
            "SELECT COUNT(*) FROM $bookings_table WHERE booking_date BETWEEN %s AND %s AND status!='cancelled'", $last_month_start, $last_month_end
        ) );
        $last_month_revenue = (float) $wpdb->get_var( $wpdb->prepare(
            "SELECT COALESCE(SUM(s.price),0) FROM $bookings_table b LEFT JOIN $services_table s ON b.service_id=s.id WHERE b.booking_date BETWEEN %s AND %s AND b.status!='cancelled'", $last_month_start, $last_month_end
        ) );

        // ── Status breakdown ────────────────────────────────────────────────────
        $status_rows   = $wpdb->get_results( "SELECT status, COUNT(*) as count FROM $bookings_table GROUP BY status" );
        $status_counts = array( 'pending' => 0, 'completed' => 0, 'cancelled' => 0 );
        foreach ( $status_rows as $row ) {
            $status_counts[ $row->status ] = (int) $row->count;
        }

        // ── Top services ────────────────────────────────────────────────────────
        $top_services = $wpdb->get_results(
            "SELECT s.name, COUNT(*) as booking_count, COALESCE(SUM(s.price),0) as revenue
             FROM $bookings_table b LEFT JOIN $services_table s ON b.service_id=s.id
             WHERE b.status!='cancelled' GROUP BY b.service_id ORDER BY booking_count DESC LIMIT 5"
        );

        // ── Top staff ───────────────────────────────────────────────────────────
        $top_staff = $wpdb->get_results(
            "SELECT st.name, COUNT(*) as booking_count
             FROM $bookings_table b LEFT JOIN $staff_table st ON b.staff_id=st.id
             WHERE b.status!='cancelled' GROUP BY b.staff_id ORDER BY booking_count DESC LIMIT 5"
        );

        // ── Daily series (supports ?days= param, default 30) ────────────────────
        $days = max( 1, min( 90, intval( $request->get_param('days') ?: 30 ) ) );
        $series = array();
        for ( $i = $days - 1; $i >= 0; $i-- ) {
            $series[] = gmdate( 'Y-m-d', strtotime( "-{$i} days" ) );
        }

        $daily_rows = $wpdb->get_results( $wpdb->prepare(
            "SELECT booking_date, COUNT(*) as count FROM $bookings_table
             WHERE booking_date BETWEEN %s AND %s AND status!='cancelled'
             GROUP BY booking_date",
            $series[0], $series[ count($series) - 1 ]
        ) );
        $daily_map = array();
        foreach ( $daily_rows as $row ) {
            $daily_map[ $row->booking_date ] = (int) $row->count;
        }
        $daily_series = array_map( fn($d) => array( 'date' => $d, 'count' => $daily_map[$d] ?? 0 ), $series );

        // ── Upcoming bookings today ──────────────────────────────────────────────
        $now_time = gmdate( 'H:i:s' );
        $upcoming_today = $wpdb->get_results( $wpdb->prepare(
            "SELECT b.customer_name, b.booking_time, s.name AS service_name, st.name AS staff_name
             FROM $bookings_table b
             LEFT JOIN $services_table s ON b.service_id=s.id
             LEFT JOIN $staff_table st ON b.staff_id=st.id
             WHERE b.booking_date=%s AND b.booking_time>=%s AND b.status!='cancelled'
             ORDER BY b.booking_time ASC LIMIT 6",
            $today, $now_time
        ) );

        // ── Pending / upcoming counts (for React summary cards) ─────────────────
        $upcoming_bookings = (int) $wpdb->get_var( $wpdb->prepare(
            "SELECT COUNT(*) FROM $bookings_table WHERE booking_date>=%s AND status!='cancelled'", $today
        ) );

        return rest_ensure_response( array(
            // summary shape the React DashboardPage expects
            'summary' => array(
                'total_bookings'    => $total_bookings,
                'upcoming_bookings' => $upcoming_bookings,
                'pending_bookings'  => $status_counts['pending'],
                'completed_revenue' => round( $total_revenue, 2 ),
            ),
            'series'         => $daily_series,
            // extra data for future use
            'totals'         => array(
                'bookings'  => $total_bookings,
                'revenue'   => round( $total_revenue, 2 ),
                'staff'     => $total_staff,
                'services'  => $total_services,
                'customers' => $total_customers,
            ),
            'today'          => array( 'bookings' => $today_bookings, 'revenue' => round( $today_revenue, 2 ) ),
            'this_month'     => array( 'bookings' => $month_bookings, 'revenue' => round( $month_revenue, 2 ) ),
            'last_month'     => array( 'bookings' => $last_month_bookings, 'revenue' => round( $last_month_revenue, 2 ) ),
            'status_counts'  => $status_counts,
            'top_services'   => $top_services,
            'top_staff'      => $top_staff,
            'upcoming_today' => $upcoming_today,
        ) );
    }
}