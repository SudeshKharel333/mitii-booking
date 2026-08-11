<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Mitii_Activator {
    public static function activate() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        // ---- Services table ----
        $table_services = $wpdb->prefix . 'mitii_services';
        $sql_services = "CREATE TABLE $table_services (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            duration_minutes INT NOT NULL DEFAULT 30,
            price DECIMAL(10,2) NOT NULL DEFAULT 0,
            image_url VARCHAR(500) DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $charset_collate;";
        dbDelta( $sql_services );

        // ---- Staff table ----
        $table_staff = $wpdb->prefix . 'mitii_staff';
        $sql_staff = "CREATE TABLE $table_staff (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) DEFAULT '',
            bio TEXT,
            image_url VARCHAR(500) DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $charset_collate;";
        dbDelta( $sql_staff );



$table_staff_services = $wpdb->prefix . 'mitii_staff_services';
$sql = "CREATE TABLE $table_staff_services (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    staff_id BIGINT UNSIGNED NOT NULL,
    service_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY staff_service_unique (staff_id, service_id)
) $charset_collate;";
dbDelta( $sql );






        // ---- Availability table ----
        $table_availability = $wpdb->prefix . 'mitii_availability';
        $sql_availability = "CREATE TABLE $table_availability (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            staff_id BIGINT UNSIGNED NOT NULL,
            day_of_week TINYINT NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            PRIMARY KEY (id),
            KEY staff_day (staff_id, day_of_week)
        ) $charset_collate;";
        dbDelta( $sql_availability );

        // ---- Bookings table ----
        $table_bookings = $wpdb->prefix . 'mitii_bookings';
        $sql_bookings = "CREATE TABLE $table_bookings (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            service_id BIGINT UNSIGNED NOT NULL,
            staff_id BIGINT UNSIGNED NOT NULL,
            customer_name VARCHAR(255) NOT NULL,
            customer_email VARCHAR(255) NOT NULL,
            booking_date DATE NOT NULL,
            booking_time TIME NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY booking_date (booking_date),
            KEY staff_date (staff_id, booking_date)
        ) $charset_collate;";
        dbDelta( $sql_bookings );

        // ---- Customers table ----
        $table_customers = $wpdb->prefix . 'mitii_customers';
        $sql_customers = "CREATE TABLE $table_customers (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY email (email)
        ) $charset_collate;";
        dbDelta( $sql_customers );

        // ---- Customer sessions table ----
        $table_sessions = $wpdb->prefix . 'mitii_customer_sessions';
        $sql_sessions = "CREATE TABLE $table_sessions (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            customer_id BIGINT UNSIGNED NOT NULL,
            token_hash VARCHAR(64) NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY token_hash (token_hash),
            KEY expires_at (expires_at)
        ) $charset_collate;";
        dbDelta( $sql_sessions );

        // ---- Holidays table (global shop closures) ----
        $table_holidays = $wpdb->prefix . 'mitii_holidays';
        $sql_holidays = "CREATE TABLE $table_holidays (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            holiday_date DATE NOT NULL,
            name VARCHAR(255) DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY holiday_date (holiday_date)
        ) $charset_collate;";
        dbDelta( $sql_holidays );

        // ---- FIX Bug 8/9: per-staff holidays table ----
        // Previously missing entirely — Mitii_Schedule_Extras_Controller was
        // reading/writing staff_id and label columns on the *global*
        // mitii_holidays table above, which has neither column and is
        // UNIQUE on holiday_date alone (so it can't hold one row per staff
        // member per date anyway). Per-staff holidays now get their own
        // table, scoped and de-duplicated per staff member.
        $table_staff_holidays = $wpdb->prefix . 'mitii_staff_holidays';
        $sql_staff_holidays = "CREATE TABLE $table_staff_holidays (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            staff_id BIGINT UNSIGNED NOT NULL,
            holiday_date DATE NOT NULL,
            label VARCHAR(255) DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY staff_date (staff_id, holiday_date)
        ) $charset_collate;";
        dbDelta( $sql_staff_holidays );

        // ---- FIX Bug 8: break times table ----
        // Previously missing entirely — Mitii_Schedule_Extras_Controller
        // read/wrote this table in get_break_times(), add_break_time(),
        // update_break_time(), delete_break_time(), and get_break_ranges(),
        // but it was never created, so every break-time API call failed.
        $table_break_times = $wpdb->prefix . 'mitii_break_times';
        $sql_break_times = "CREATE TABLE $table_break_times (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            staff_id BIGINT UNSIGNED NOT NULL,
            day_of_week TINYINT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            label VARCHAR(255) DEFAULT 'Break',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY staff_day (staff_id, day_of_week)
        ) $charset_collate;";
        dbDelta( $sql_break_times );

        // ---- Custom capability ----
        $admin_role = get_role( 'administrator' );
        if ( $admin_role && ! $admin_role->has_cap( 'manage_mitii_bookings' ) ) {
            $admin_role->add_cap( 'manage_mitii_bookings' );
        }

        // ---- Schedule session cleanup ----
        Mitii_Session_Cleanup::schedule();
    }
}