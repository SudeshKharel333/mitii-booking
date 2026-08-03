<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Mitii_Session_Cleanup {

    const CRON_HOOK = 'mitii_cleanup_expired_sessions';

    /**
     * Schedules the daily cleanup event, if it isn't already scheduled.
     * Safe to call on every plugin load — wp_next_scheduled() prevents
     * accidentally stacking up duplicate scheduled events.
     */
    public static function schedule() {
        if ( ! wp_next_scheduled( self::CRON_HOOK ) ) {
            wp_schedule_event( time(), 'daily', self::CRON_HOOK );
        }
    }

    /** Removes the scheduled event — called when the plugin is deactivated. */
    public static function unschedule() {
        $timestamp = wp_next_scheduled( self::CRON_HOOK );
        if ( $timestamp ) {
            wp_unschedule_event( $timestamp, self::CRON_HOOK );
        }
    }

    /**
     * The actual cleanup: deletes any customer session row whose
     * expires_at has already passed. Runs once a day via WP-Cron.
     */
    public static function run_cleanup() {
        global $wpdb;
        $table = $wpdb->prefix . 'mitii_customer_sessions';

        $wpdb->query(
            "DELETE FROM $table WHERE expires_at < NOW()"
        );
    }
}