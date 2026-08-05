<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Mitii_Dashboard_Controller {

    public static function register_routes() {
        register_rest_route( 'mitii/v1', '/dashboard', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'get_dashboard' ),
            'permission_callback' => array( __CLASS__, 'check_admin_permission' ),
        ) );
    }

    public static function check_admin_permission() {
        return current_user_can( 'manage_options' );
    }

    public static function get_dashboard() {
        global $wpdb;

        $bookings_table = $wpdb->prefix . 'mitii_bookings';
        $services_table = $wpdb->prefix . 'mitii_services';
        $staff_table    = $wpdb->prefix . 'mitii_staff';
        $customers_table = $wpdb->prefix . 'mitii_customers';

        $today     = gmdate( 'Y-m-d' );
        $this_month_start = gmdate( 'Y-m-01' );
        $last_month_start = gmdate( 'Y-m-01', strtotime( '-1 month' ) );
        $last_month_end   = gmdate( 'Y-m-t', strtotime( '-1 month' ) );

        // ── Totals ────────────────────────────────────────────────────────────
        $total_bookings = (int) $wpdb->get_var( "SELECT COUNT(*) FROM $bookings_table" );

        $total_revenue = (float) $wpdb->get_var(
            "SELECT COALESCE( SUM( s.price ), 0 )
             FROM $bookings_table b
             LEFT JOIN $services_table s ON b.service_id = s.id
             WHERE b.status != 'cancelled'"
        );

        $total_staff    = (int) $wpdb->get_var( "SELECT COUNT(*) FROM $staff_table" );
        $total_services = (int) $wpdb->get_var( "SELECT COUNT(*) FROM $services_table" );
        $total_customers = (int) $wpdb->get_var( "SELECT COUNT(*) FROM $customers_table" );

        // ── Today ─────────────────────────────────────────────────────────────
        $today_bookings = (int) $wpdb->get_var(
            $wpdb->prepare( "SELECT COUNT(*) FROM $bookings_table WHERE booking_date = %s AND status != 'cancelled'", $today )
        );

        $today_revenue = (float) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COALESCE( SUM( s.price ), 0 )
                 FROM $bookings_table b
                 LEFT JOIN $services_table s ON b.service_id = s.id
                 WHERE b.booking_date = %s AND b.status != 'cancelled'",
                $today
            )
        );

        // ── This month ────────────────────────────────────────────────────────
        $month_bookings = (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM $bookings_table WHERE booking_date >= %s AND status != 'cancelled'",
                $this_month_start
            )
        );

        $month_revenue = (float) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COALESCE( SUM( s.price ), 0 )
                 FROM $bookings_table b
                 LEFT JOIN $services_table s ON b.service_id = s.id
                 WHERE b.booking_date >= %s AND b.status != 'cancelled'",
                $this_month_start
            )
        );

        // ── Last month (for % change) ──────────────────────────────────────
        $last_month_bookings = (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM $bookings_table WHERE booking_date BETWEEN %s AND %s AND status != 'cancelled'",
                $last_month_start,
                $last_month_end
            )
        );

        $last_month_revenue = (float) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COALESCE( SUM( s.price ), 0 )
                 FROM $bookings_table b
                 LEFT JOIN $services_table s ON b.service_id = s.id
                 WHERE b.booking_date BETWEEN %s AND %s AND b.status != 'cancelled'",
                $last_month_start,
                $last_month_end
            )
        );

        // ── Status breakdown ──────────────────────────────────────────────────
        $status_rows = $wpdb->get_results(
            "SELECT status, COUNT(*) as count FROM $bookings_table GROUP BY status"
        );
        $status_counts = array( 'pending' => 0, 'completed' => 0, 'cancelled' => 0 );
        foreach ( $status_rows as $row ) {
            $status_counts[ $row->status ] = (int) $row->count;
        }

        // ── Top services ──────────────────────────────────────────────────────
        $top_services = $wpdb->get_results(
            "SELECT s.name, COUNT(*) as booking_count, COALESCE( SUM( s.price ), 0 ) as revenue
             FROM $bookings_table b
             LEFT JOIN $services_table s ON b.service_id = s.id
             WHERE b.status != 'cancelled'
             GROUP BY b.service_id
             ORDER BY booking_count DESC
             LIMIT 5"
        );

        // ── Top staff ─────────────────────────────────────────────────────────
        $top_staff = $wpdb->get_results(
            "SELECT st.name, COUNT(*) as booking_count
             FROM $bookings_table b
             LEFT JOIN $staff_table st ON b.staff_id = st.id
             WHERE b.status != 'cancelled'
             GROUP BY b.staff_id
             ORDER BY booking_count DESC
             LIMIT 5"
        );

        // ── Bookings last 7 days (for sparkline / bar chart) ─────────────────
        $seven_days = array();
        for ( $i = 6; $i >= 0; $i-- ) {
            $seven_days[] = gmdate( 'Y-m-d', strtotime( "-{$i} days" ) );
        }

        $daily_rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT booking_date, COUNT(*) as count
                 FROM $bookings_table
                 WHERE booking_date BETWEEN %s AND %s AND status != 'cancelled'
                 GROUP BY booking_date",
                $seven_days[0],
                $seven_days[6]
            )
        );

        $daily_map = array();
        foreach ( $daily_rows as $row ) {
            $daily_map[ $row->booking_date ] = (int) $row->count;
        }

        $daily_bookings = array();
        foreach ( $seven_days as $date ) {
            $daily_bookings[] = array(
                'date'  => $date,
                'label' => gmdate( 'D', strtotime( $date ) ), // Mon, Tue …
                'count' => $daily_map[ $date ] ?? 0,
            );
        }

        // ── Upcoming bookings today ───────────────────────────────────────────
        $now_time = gmdate( 'H:i:s' );
        $upcoming_today = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT b.customer_name, b.customer_email, b.booking_time, s.name AS service_name, st.name AS staff_name
                 FROM $bookings_table b
                 LEFT JOIN $services_table s ON b.service_id = s.id
                 LEFT JOIN $staff_table st ON b.staff_id = st.id
                 WHERE b.booking_date = %s AND b.booking_time >= %s AND b.status != 'cancelled'
                 ORDER BY b.booking_time ASC
                 LIMIT 6",
                $today,
                $now_time
            )
        );

        return rest_ensure_response( array(
            'totals' => array(
                'bookings'  => $total_bookings,
                'revenue'   => round( $total_revenue, 2 ),
                'staff'     => $total_staff,
                'services'  => $total_services,
                'customers' => $total_customers,
            ),
            'today' => array(
                'bookings' => $today_bookings,
                'revenue'  => round( $today_revenue, 2 ),
            ),
            'this_month' => array(
                'bookings' => $month_bookings,
                'revenue'  => round( $month_revenue, 2 ),
            ),
            'last_month' => array(
                'bookings' => $last_month_bookings,
                'revenue'  => round( $last_month_revenue, 2 ),
            ),
            'status_counts'  => $status_counts,
            'top_services'   => $top_services,
            'top_staff'      => $top_staff,
            'daily_bookings' => $daily_bookings,
            'upcoming_today' => $upcoming_today,
        ) );
    }
}