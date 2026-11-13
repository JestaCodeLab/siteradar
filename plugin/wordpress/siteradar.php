<?php
/**
 * Plugin Name: SiteRadar
 * Description: Connects this website to your SiteRadar account. Adds the tracking snippet automatically and applies the fixes you approve in SiteRadar.
 * Version: 0.4.1
 * Requires at least: 5.6
 * Requires PHP: 8.2
 * Author: SiteRadar
 * License: GPL-2.0-or-later
 * Text Domain: siteradar
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'SITERADAR_VERSION', '0.4.1' );
define( 'SITERADAR_FILE', __FILE__ );
define( 'SITERADAR_DIR', plugin_dir_path( __FILE__ ) );

// Older PHP versions no longer get security fixes, so the plugin does not run on them.
if ( PHP_VERSION_ID < 80200 ) {
	add_action(
		'admin_notices',
		static function () {
			echo '<div class="notice notice-error"><p><strong>SiteRadar</strong> needs PHP 8.2 or newer, and this website runs PHP ' . esc_html( PHP_VERSION ) . '. Ask your host to update PHP, then activate the plugin again.</p></div>';
		}
	);
	return;
}

require_once SITERADAR_DIR . 'includes/connection.php';
require_once SITERADAR_DIR . 'includes/snippet.php';
require_once SITERADAR_DIR . 'includes/fixes.php';
require_once SITERADAR_DIR . 'includes/edits.php';
require_once SITERADAR_DIR . 'includes/admin.php';

register_activation_hook( __FILE__, 'siteradar_activate' );
register_deactivation_hook( __FILE__, 'siteradar_deactivate' );

add_action( 'plugins_loaded', 'siteradar_import_connection' );
add_action( 'wp_head', 'siteradar_print_snippet', 1 );
add_action( 'wp_head', 'siteradar_print_viewport', 1 );
add_action( 'wp_head', 'siteradar_print_head_fixes', 5 );
add_action( 'send_headers', 'siteradar_send_fix_headers' );
add_action( 'init', 'siteradar_boot_fixes', 1 );
add_filter( 'pre_get_document_title', 'siteradar_own_title', 20 );
add_action( 'wp_head', 'siteradar_print_own_description', 2 );
add_action( 'template_redirect', 'siteradar_start_buffer', 1 );
add_action( 'siteradar_heartbeat', 'siteradar_send_heartbeat' );
add_action( 'admin_init', 'siteradar_maybe_heartbeat' );
add_action( 'rest_api_init', 'siteradar_register_rest' );
add_action( 'admin_menu', 'siteradar_admin_menu' );
add_action( 'admin_head', 'siteradar_menu_icon_css' );
add_action( 'admin_enqueue_scripts', 'siteradar_admin_assets' );
add_action( 'admin_post_siteradar_save', 'siteradar_handle_save' );
add_action( 'admin_post_siteradar_check', 'siteradar_handle_check' );
