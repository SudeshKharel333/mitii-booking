<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Mitii_Admin_Menu {

    /**
     * FIX: register() is already called from add_action('admin_menu', ...) in mitii-booking.php.
     * Previously, register() called add_action('admin_menu', 'add_menu') again — a hook inside
     * a hook — which is unreliable. Now we just call add_menu() and enqueue registration directly.
     */
    public static function register() {
        self::add_menu();
        add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );
    }

    public static function add_menu() {
        // Parent menu
        add_menu_page(
            'Mitii Booking',
            'Mitii Booking',
            'manage_mitii_bookings',
            'mitii-booking',
            array( __CLASS__, 'render_dashboard' ),
            'dashicons-calendar-alt',
            26
        );

        // Submenus
        add_submenu_page( 'mitii-booking', 'Dashboard',  'Dashboard',  'manage_mitii_bookings', 'mitii-booking',   array( __CLASS__, 'render_dashboard' ) );
        add_submenu_page( 'mitii-booking', 'Bookings',   'Bookings',   'manage_mitii_bookings', 'mitii-bookings',  array( __CLASS__, 'render_bookings' ) );
        add_submenu_page( 'mitii-booking', 'Services',   'Services',   'manage_mitii_bookings', 'mitii-services',  array( __CLASS__, 'render_services' ) );
        add_submenu_page( 'mitii-booking', 'Staff',      'Staff',      'manage_mitii_bookings', 'mitii-staff',     array( __CLASS__, 'render_staff' ) );
        add_submenu_page( 'mitii-booking', 'Customers',  'Customers',  'manage_mitii_bookings', 'mitii-customers', array( __CLASS__, 'render_customers' ) );
        add_submenu_page( 'mitii-booking', 'Settings',   'Settings',   'manage_mitii_bookings', 'mitii-settings',  array( __CLASS__, 'render_settings' ) );
    }

    // ── Page renderers ─────────────────────────────────────────────────────────

    public static function render_dashboard() {
        echo '<div class="wrap"><div id="mitii-dashboard-root"></div></div>';
    }

    public static function render_bookings() {
        echo '<div class="wrap"><div id="mitii-bookings-root"></div></div>';
    }

    public static function render_services() {
        echo '<div class="wrap"><div id="mitii-services-root"></div></div>';
    }

    public static function render_staff() {
        echo '<div class="wrap"><div id="mitii-staff-root"></div></div>';
    }

    public static function render_customers() {
        echo '<div class="wrap"><div id="mitii-customers-root"></div></div>';
    }

    public static function render_settings() {
        echo '<div class="wrap"><div id="mitii-settings-root"></div></div>';
    }

    // ── Asset enqueuing ────────────────────────────────────────────────────────

    private static function localize( $handle ) {
        wp_localize_script( $handle, 'mitiiAdminData', array(
            'restUrl' => esc_url_raw( rest_url( 'mitii/v1' ) ),
            'nonce'   => wp_create_nonce( 'wp_rest' ),  // must be wp_rest for WP REST API cookie auth
        ) );
    }

    private static function enqueue_bundle( $slug, $handle ) {
        $asset_path = MITII_PLUGIN_DIR . "build/{$slug}.asset.php";
        if ( ! file_exists( $asset_path ) ) {
            return; // bundle not built yet — skip silently, no fatal error
        }
        $asset = include $asset_path;

        wp_enqueue_script(
            $handle,
            MITII_PLUGIN_URL . "build/{$slug}.js",
            $asset['dependencies'],
            $asset['version'],
            true
        );

        $css = MITII_PLUGIN_DIR . "build/{$slug}.css";
        if ( file_exists( $css ) ) {
            wp_enqueue_style( $handle . '-style', MITII_PLUGIN_URL . "build/{$slug}.css", array(), $asset['version'] );
        }

        self::localize( $handle );
    }

    public static function enqueue_assets( $hook ) {
        $map = array(
            'toplevel_page_mitii-booking'        => array( 'admin-dashboard', 'mitii-admin-dashboard' ),
            'mitii-booking_page_mitii-bookings'  => array( 'admin-bookings',  'mitii-admin-bookings'  ),
            'mitii-booking_page_mitii-services'  => array( 'admin-services',  'mitii-admin-services'  ),
            'mitii-booking_page_mitii-staff'     => array( 'admin-staff',     'mitii-admin-staff'     ),
            'mitii-booking_page_mitii-customers' => array( 'admin-customers', 'mitii-admin-customers' ),
            'mitii-booking_page_mitii-settings'  => array( 'admin-settings',  'mitii-admin-settings'  ),
        );

        if ( isset( $map[ $hook ] ) ) {
            self::enqueue_bundle( $map[ $hook ][0], $map[ $hook ][1] );
        }
    }
}