<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Mitii_Settings_Page {

    public static function register() {
        add_action( 'admin_menu', array( __CLASS__, 'add_menu' ) );
        add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );
    }

    public static function add_menu() {
        add_submenu_page(
            'mitii-booking',           // Parent slug — MUST match admin menu
            'Mitii Settings',
            'Settings',
            'manage_mitii_bookings',
            'mitii-settings',
            array( __CLASS__, 'render_page' )
        );
    }

    public static function render_page() {
        echo '<div class="wrap"><h1>Mitii Settings</h1><div id="mitii-settings-root"></div></div>';
    }

    public static function enqueue_assets( $hook ) {
        if ( $hook !== 'mitii-booking_page_mitii-settings' ) {
            return;
        }

        $asset_file = include MITII_PLUGIN_DIR . 'build/admin-settings.asset.php';

        wp_enqueue_script(
            'mitii-admin-settings',
            MITII_PLUGIN_URL . 'build/admin-settings.js',
            $asset_file['dependencies'],
            $asset_file['version'],
            true
        );

        $css_path = MITII_PLUGIN_DIR . 'build/admin-settings.css';
        if ( file_exists( $css_path ) ) {
            wp_enqueue_style(
                'mitii-admin-settings-style',
                MITII_PLUGIN_URL . 'build/admin-settings.css',
                array(),
                $asset_file['version']
            );
        }

        wp_localize_script( 'mitii-admin-settings', 'mitiiSettingsData', array(
            'restUrl' => esc_url_raw( rest_url( 'mitii/v1' ) ),
            'nonce'   => wp_create_nonce( 'wp_rest' ),
        ) );
    }
}