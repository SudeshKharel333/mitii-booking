<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Alternative to Mitii_Page_Template: instead of swapping in a whole custom
 * page shell, this hides the active theme's header/footer/nav with CSS
 * whenever the current page contains any of the three Mitii shortcodes —
 * [mitii_booking], [mitii_booking_by_staff], or [mitii_customer_portal].
 *
 * No "Page Attributes > Template" step needed, so it works even on themes
 * that don't expose custom page templates (common with block/FSE themes),
 * and it applies automatically — no per-page setup or URL parameter needed.
 */
class Mitii_Clean_Mode {

    const SHORTCODES = array( 'mitii_booking', 'mitii_booking_by_staff', 'mitii_customer_portal' );

    public static function register() {
        add_action( 'wp_enqueue_scripts', array( __CLASS__, 'maybe_enqueue' ) );
    }

    public static function maybe_enqueue() {
        if ( ! self::page_has_mitii_shortcode() ) {
            return;
        }

        $selectors = apply_filters( 'mitii_clean_mode_selectors', array(
            'header',
            'footer',
            'nav',
            '#masthead',
            '#colophon',
            '.site-header',
            '.site-footer',
            '.wp-block-template-part',
        ) );

        $css = implode( ', ', $selectors ) . ' { display: none !important; }';
        $css .= ' body.mitii-clean-mode { background: #F4F3EF; }';

        wp_register_style( 'mitii-clean-mode', false, array(), '1.0.0' );
        wp_enqueue_style( 'mitii-clean-mode' );
        wp_add_inline_style( 'mitii-clean-mode', $css );

        add_filter( 'body_class', array( __CLASS__, 'add_body_class' ) );
    }

    public static function add_body_class( $classes ) {
        $classes[] = 'mitii-clean-mode';
        return $classes;
    }

    private static function page_has_mitii_shortcode() {
        if ( ! is_singular() ) {
            return false;
        }

        $post = get_post();
        if ( ! $post ) {
            return false;
        }

        foreach ( self::SHORTCODES as $shortcode ) {
            if ( has_shortcode( $post->post_content, $shortcode ) ) {
                return true;
            }
        }

        return false;
    }
}