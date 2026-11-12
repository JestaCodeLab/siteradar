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
	siteradar_send_disconnect();
	wp_clear_scheduled_hook( 'siteradar_heartbeat' );
}

/**
 * Tell SiteRadar the plugin is being switched off, so the dashboard stops showing the website as connected.
 */
function siteradar_send_disconnect() {
	if ( ! siteradar_is_configured() ) {
		return;
	}
	wp_remote_post(
		trailingslashit( get_option( 'siteradar_api' ) ) . 'api/connector/disconnect',
		array(
			'timeout' => 5,
			'headers' => array( 'Authorization' => 'Bearer ' . get_option( 'siteradar_site_id' ) . '.' . get_option( 'siteradar_key' ) ),
		)
	);
}

/**
 * A public ping, so SiteRadar can look from outside whether the plugin is really on this website. It reveals nothing but the website id that is already in the public tracking snippet.
 */
function siteradar_register_rest() {
	register_rest_route(
		'siteradar/v1',
		'/ping',
		array(
			'methods'             => 'GET',
			'callback'            => 'siteradar_rest_ping',
			'permission_callback' => '__return_true',
		)
	);
	register_rest_route(
		'siteradar/v1',
		'/nudge',
		array(
			'methods'             => 'POST',
			'callback'            => 'siteradar_rest_nudge',
			'permission_callback' => '__return_true',
		)
	);
}

/**
 * SiteRadar taps on the shoulder when a fix was switched on or off, so it is applied at once. The tap carries nothing: the plugin asks SiteRadar,
 * with its own key, what to do. Limited to one check-in every 20 seconds.
 */
function siteradar_rest_nudge() {
	if ( ! get_transient( 'siteradar_nudged' ) ) {
		set_transient( 'siteradar_nudged', 1, 20 );
		siteradar_send_heartbeat();
	}
	return array( 'ok' => true );
}

function siteradar_rest_ping() {
	return array(
		'ok'      => true,
		'site_id' => (string) get_option( 'siteradar_site_id' ),
		'version' => SITERADAR_VERSION,
	);
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
function siteradar_send_heartbeat( $again = true ) {
	if ( ! siteradar_is_configured() ) {
		return new WP_Error( 'siteradar_not_configured', 'This plugin has no connection details.' );
	}
	$edit_results = get_option( 'siteradar_edit_results', array() );
	$res          = wp_remote_post(
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
					'fixes'          => siteradar_active_fixes(),
					'edit_results'   => is_array( $edit_results ) ? $edit_results : array(),
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
	if ( ! $ok ) {
		return new WP_Error( 'siteradar_http', $msg );
	}
	if ( $edit_results ) {
		delete_option( 'siteradar_edit_results' ); // SiteRadar has them now
	}
	$answer = json_decode( wp_remote_retrieve_body( $res ), true );
	// SiteRadar says which fixes should be on and which approved text changes to apply. When something changed, check in once more so SiteRadar sees the result.
	$again_needed = false;
	if ( is_array( $answer ) && isset( $answer['fixes'] ) && siteradar_store_fixes( $answer['fixes'] ) ) {
		$again_needed = true;
	}
	if ( is_array( $answer ) && ! empty( $answer['edits'] ) && is_array( $answer['edits'] ) ) {
		$done = siteradar_apply_edits( $answer['edits'] );
		if ( $done ) {
			update_option( 'siteradar_edit_results', $done, false );
			$again_needed = true;
		}
	}
	if ( $again_needed && $again ) {
		return siteradar_send_heartbeat( false );
	}
	return $answer;
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
