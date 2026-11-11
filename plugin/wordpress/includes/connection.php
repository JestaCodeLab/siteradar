<?php
/**
 * The connection to SiteRadar: where it lives, the key that proves this website is yours, and the heartbeat that tells SiteRadar the plugin is working.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function siteradar_activate() {
	siteradar_import_connection();
	if ( ! wp_next_scheduled( 'siteradar_heartbeat' ) ) {
		wp_schedule_event( time() + 60, 'twicedaily', 'siteradar_heartbeat' );
	}
	siteradar_send_heartbeat();
}

function siteradar_deactivate() {
	wp_clear_scheduled_hook( 'siteradar_heartbeat' );
}

/**
 * The downloaded plugin carries siteradar-connection.php with this website's details. Read it once into the database settings.
 */
function siteradar_import_connection() {
	$file = SITERADAR_DIR . 'siteradar-connection.php';
	if ( get_option( 'siteradar_key' ) || ! is_readable( $file ) ) {
		return;
	}
	$conn = include $file;
	if ( ! is_array( $conn ) || empty( $conn['api'] ) || empty( $conn['site_id'] ) || empty( $conn['key'] ) ) {
		return;
	}
	update_option( 'siteradar_api', esc_url_raw( $conn['api'] ), false );
	update_option( 'siteradar_site_id', sanitize_text_field( $conn['site_id'] ), false );
	update_option( 'siteradar_key', sanitize_text_field( $conn['key'] ), false );
}

function siteradar_is_configured() {
	return get_option( 'siteradar_api' ) && get_option( 'siteradar_site_id' ) && get_option( 'siteradar_key' );
}

/**
 * Which SEO plugin is active, if any. SiteRadar uses it to write titles and descriptions where that plugin reads them.
 */
function siteradar_seo_plugin() {
	if ( defined( 'WPSEO_VERSION' ) ) {
		return 'yoast';
	}
	if ( defined( 'RANK_MATH_VERSION' ) ) {
		return 'rankmath';
	}
	if ( defined( 'AIOSEO_VERSION' ) ) {
		return 'aioseo';
	}
	if ( defined( 'SEOPRESS_VERSION' ) ) {
		return 'seopress';
	}
	return '';
}

/**
 * Tell SiteRadar the plugin is alive. Returns the answer from SiteRadar, or a WP_Error. Stores the outcome so the settings page can show it.
 */
function siteradar_send_heartbeat() {
	if ( ! siteradar_is_configured() ) {
		return new WP_Error( 'siteradar_not_configured', 'This plugin has no connection details.' );
	}
	$res = wp_remote_post(
		trailingslashit( get_option( 'siteradar_api' ) ) . 'api/connector/heartbeat',
		array(
			'timeout' => 10,
			'headers' => array(
				'Authorization' => 'Bearer ' . get_option( 'siteradar_site_id' ) . '.' . get_option( 'siteradar_key' ),
				'Content-Type'  => 'application/json',
			),
			'body'    => wp_json_encode(
				array(
					'plugin_version' => SITERADAR_VERSION,
					'wp_version'     => get_bloginfo( 'version' ),
					'php_version'    => PHP_VERSION,
					'seo_plugin'     => siteradar_seo_plugin(),
					'snippet'        => siteradar_snippet_enabled() ? 'on' : 'off',
				)
			),
		)
	);
	if ( is_wp_error( $res ) ) {
		update_option(
			'siteradar_last_result',
			array(
				'ok'      => false,
				'time'    => time(),
				'message' => $res->get_error_message(),
			),
			false
		);
		return $res;
	}
	$code = (int) wp_remote_retrieve_response_code( $res );
	$ok   = 200 === $code;
	$msg  = '';
	if ( ! $ok ) {
		$msg = 401 === $code
			? 'SiteRadar did not accept this connection. Download the plugin again from your SiteRadar account.'
			: 'SiteRadar answered with an error (' . $code . ').';
	}
	update_option(
		'siteradar_last_result',
		array(
			'ok'      => $ok,
			'time'    => time(),
			'message' => $msg,
		),
		false
	);
	return $ok ? json_decode( wp_remote_retrieve_body( $res ), true ) : new WP_Error( 'siteradar_http', $msg );
}

/**
 * Check in at most once an hour while someone is using the admin, in case WP-Cron is switched off on this host.
 */
function siteradar_maybe_heartbeat() {
	if ( ! siteradar_is_configured() || ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$last = get_option( 'siteradar_last_result' );
	if ( is_array( $last ) && ! empty( $last['time'] ) && ( time() - (int) $last['time'] ) < HOUR_IN_SECONDS ) {
		return;
	}
	siteradar_send_heartbeat();
}
