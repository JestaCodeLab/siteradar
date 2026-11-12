<?php
/**
 * Removes the plugin's settings when it is deleted from WordPress.
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

foreach ( array( 'siteradar_api', 'siteradar_site_id', 'siteradar_key', 'siteradar_snippet', 'siteradar_last_result', 'siteradar_fixes', 'siteradar_edit_results' ) as $option ) {
	delete_option( $option );
}
wp_clear_scheduled_hook( 'siteradar_heartbeat' );
