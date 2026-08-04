<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Mitii_Rate_Limiter {

    /**
     * Returns true if this request is allowed, false if the caller has
     * exceeded $max_attempts within the last $window_seconds.
     *
     * Each allowed call counts as one "attempt" — call this once per
     * incoming request, right at the top of the endpoint you're protecting.
     */
    public static function check( $key, $max_attempts, $window_seconds ) {
        $transient_key = 'mitii_rl_' . md5( $key );
        $data = get_transient( $transient_key );

        if ( false === $data || ! is_array( $data ) ) {
            $data = array( 'count' => 0, 'window_start' => time() );
        }

        // The tracking window has expired — start a fresh one.
        if ( ( time() - $data['window_start'] ) > $window_seconds ) {
            $data = array( 'count' => 0, 'window_start' => time() );
        }

        if ( $data['count'] >= $max_attempts ) {
            return false;
        }

        $data['count']++;
        set_transient( $transient_key, $data, $window_seconds );

        return true;
    }

    /**
     * Best-effort client IP lookup. Note: on a site behind a proxy or
     * load balancer, REMOTE_ADDR may reflect the proxy rather than the
     * real visitor — a production deployment behind Cloudflare/etc. would
     * need to read a trusted forwarded-for header instead.
     */
    public static function get_client_ip() {
        if ( ! empty( $_SERVER['REMOTE_ADDR'] ) ) {
            return sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) );
        }
        return 'unknown';
    }
}