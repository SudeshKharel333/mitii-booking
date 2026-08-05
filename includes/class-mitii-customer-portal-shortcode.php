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

  $css_path = MITII_PLUGIN_DIR . 'build/customer-portal.css';
        if ( file_exists( $css_path ) ) {
            wp_enqueue_style(
                'mitii-customer-portal-style',
                MITII_PLUGIN_URL . 'build/customer-portal.css',
                array(),
                $asset_file['version']
            );
        }

        wp_localize_script( 'mitii-customer-portal', 'mitiiPortalData', array(
            'serviceBookingUrl' => self::find_page_url_for_shortcode( 'mitii_booking' ),
            'staffBookingUrl'   => self::find_page_url_for_shortcode( 'mitii_booking_by_staff' ),
        ) );
    }

    private static function find_page_url_for_shortcode( $shortcode ) {
        $pages = get_posts( array(
            'post_type'   => 'page',
            'post_status' => 'publish',
            'numberposts' => -1,
        ) );

        foreach ( $pages as $page ) {
            if ( has_shortcode( $page->post_content, $shortcode ) ) {
                return get_permalink( $page->ID );
            }
        }

        return '';
    }
}