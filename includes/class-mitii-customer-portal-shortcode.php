<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Mitii_Customer_Portal_Shortcode {

    public static function register() {
        add_shortcode( 'mitii_customer_portal', array( __CLASS__, 'render' ) );
    }

    public static function render() {
        return '<div id="mitii-customer-portal-root"></div>';
    }

    public static function enqueue_assets() {
        if ( ! is_singular() || ! has_shortcode( get_post()->post_content, 'mitii_customer_portal' ) ) {
            return;
        }

        $asset_file = include MITII_PLUGIN_DIR . 'build/customer-portal.asset.php';

        wp_enqueue_script(
            'mitii-customer-portal',
            MITII_PLUGIN_URL . 'build/customer-portal.js',
            $asset_file['dependencies'],
            $asset_file['version'],
            true
        );

wp_localize_script( 'mitii-customer-portal', 'mitiiPortalData', array(
        'nonce' => wp_create_nonce( 'wp_rest' ),
    ) );





    }
}