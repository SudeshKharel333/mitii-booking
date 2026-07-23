<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Mitii_Customer_Session {

    const COOKIE_NAME = 'mitii_customer_session';
    const SESSION_LIFETIME_DAYS = 30;

    public static function create_session( $customer_id ) {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_customer_sessions';

        $raw_token  = wp_generate_password( 48, false, false );
        $token_hash = hash( 'sha256', $raw_token );
        $expires_at = gmdate( 'Y-m-d H:i:s', time() + ( self::SESSION_LIFETIME_DAYS * DAY_IN_SECONDS ) );

        $wpdb->insert( $table, array(
            'customer_id' => $customer_id,
            'token_hash'  => $token_hash,
            'expires_at'  => $expires_at,
        ) );

        setcookie(
            self::COOKIE_NAME,
            $raw_token,
            time() + ( self::SESSION_LIFETIME_DAYS * DAY_IN_SECONDS ),
            COOKIEPATH ?: '/',
            COOKIE_DOMAIN,
            is_ssl(),
            true // httponly — JavaScript can never read this cookie directly
        );
    }

    public static function get_current_customer_id() {
        if ( empty( $_COOKIE[ self::COOKIE_NAME ] ) ) {
            return null;
        }

        global $wpdb;
        $table = $wpdb->prefix . 'mitii_customer_sessions';
        $token_hash = hash( 'sha256', $_COOKIE[ self::COOKIE_NAME ] );

        $session = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM $table WHERE token_hash = %s AND expires_at > NOW()",
                $token_hash
            )
        );

        return $session ? intval( $session->customer_id ) : null;
    }

    public static function destroy_session() {
        if ( ! empty( $_COOKIE[ self::COOKIE_NAME ] ) ) {
            global $wpdb;
            $table = $wpdb->prefix . 'mitii_customer_sessions';
            $token_hash = hash( 'sha256', $_COOKIE[ self::COOKIE_NAME ] );
            $wpdb->delete( $table, array( 'token_hash' => $token_hash ) );
        }

        setcookie( self::COOKIE_NAME, '', time() - 3600, COOKIEPATH ?: '/', COOKIE_DOMAIN, is_ssl(), true );
    }
}