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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $charset_collate;";
        dbDelta( $sql_staff );

        // ---- Availability table (which staff work which days/hours) ----
        $table_availability = $wpdb->prefix . 'mitii_availability';
        $sql_availability = "CREATE TABLE $table_availability (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            staff_id BIGINT UNSIGNED NOT NULL,
            day_of_week TINYINT NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            PRIMARY KEY (id)
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
            PRIMARY KEY (id)
        ) $charset_collate;";
        dbDelta( $sql_bookings );





// ---- Staff <-> Services junction table ----
$table_staff_services = $wpdb->prefix . 'mitii_staff_services';
$sql_staff_services = "CREATE TABLE $table_staff_services (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    staff_id BIGINT UNSIGNED NOT NULL,
    service_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY staff_service_unique (staff_id, service_id)
) $charset_collate;";
dbDelta( $sql_staff_services );





    }


    

}