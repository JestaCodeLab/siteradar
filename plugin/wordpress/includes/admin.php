<?php
/**
 * Settings page: the SiteRadar item in the admin menu. Styled like the SiteRadar dashboard. Shows whether the connection works and lets the owner switch the tracking snippet off.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function siteradar_admin_menu() {
	// Its own item in the admin menu with the SiteRadar icon, not a page tucked under Settings.
	add_menu_page( 'SiteRadar', 'SiteRadar', 'manage_options', 'siteradar', 'siteradar_render_page', plugins_url( 'assets/siteradar-icon.svg', SITERADAR_FILE ), 80 );
}

/**
 * The stylesheet is loaded on this page only, so it can never change how the rest of the admin looks.
 */
function siteradar_admin_assets( $hook ) {
	if ( 'toplevel_page_siteradar' !== $hook ) {
		return;
	}
	wp_enqueue_style( 'siteradar-admin', plugins_url( 'assets/siteradar-admin.css', SITERADAR_FILE ), array(), SITERADAR_VERSION );
}

function siteradar_handle_save() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have permission to do that.', 'siteradar' ), 403 );
	}
	check_admin_referer( 'siteradar_save' );
	update_option( 'siteradar_snippet', isset( $_POST['siteradar_snippet'] ) ? 'yes' : 'no', false );
	siteradar_send_heartbeat();
	wp_safe_redirect(
		add_query_arg(
			array(
				'page'  => 'siteradar',
				'saved' => '1',
			),
			admin_url( 'admin.php' )
		)
	);
	exit;
}

function siteradar_handle_check() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have permission to do that.', 'siteradar' ), 403 );
	}
	check_admin_referer( 'siteradar_check' );
	siteradar_send_heartbeat();
	wp_safe_redirect( add_query_arg( array( 'page' => 'siteradar' ), admin_url( 'admin.php' ) ) );
	exit;
}

function siteradar_render_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$configured = siteradar_is_configured();
	$last       = get_option( 'siteradar_last_result' );
	$connected  = $configured && is_array( $last ) && ! empty( $last['ok'] );
	$logo       = plugins_url( 'assets/siteradar-logo.svg', SITERADAR_FILE );
	$seo_names  = array(
		'yoast'    => 'Yoast SEO',
		'rankmath' => 'Rank Math',
		'aioseo'   => 'All in One SEO',
		'seopress' => 'SEOPress',
	);
	$seo        = siteradar_seo_plugin();
	?>
	<div class="wrap siteradar-wrap">
		<div class="siteradar-head">
			<img src="<?php echo esc_url( $logo ); ?>" alt="SiteRadar">
			<span class="siteradar-version">Plugin version <?php echo esc_html( SITERADAR_VERSION ); ?></span>
		</div>
		<h1 class="screen-reader-text">SiteRadar</h1>
		<hr class="wp-header-end">

		<?php if ( isset( $_GET['saved'] ) ) : // phpcs:ignore WordPress.Security.NonceVerification ?>
			<div class="siteradar-note is-ok" role="status">Settings saved.</div>
		<?php endif; ?>

		<section class="siteradar-card" aria-labelledby="siteradar-conn">
			<div class="siteradar-title">
				<h2 id="siteradar-conn">Connection</h2>
				<?php if ( $connected ) : ?>
					<span class="siteradar-chip is-ok">Connected</span>
				<?php elseif ( $configured ) : ?>
					<span class="siteradar-chip is-bad">Not connected</span>
				<?php else : ?>
					<span class="siteradar-chip is-warn">Set up needed</span>
				<?php endif; ?>
			</div>

			<?php if ( ! $configured ) : ?>
				<p>This copy of the plugin has no connection details. In SiteRadar, open this website and download the WordPress plugin from there, then upload that file here under Plugins, Add New, Upload Plugin.</p>
			<?php elseif ( $connected ) : ?>
				<p>This website is connected to your SiteRadar account. Last contact: <?php echo esc_html( human_time_diff( (int) $last['time'] ) ); ?> ago.</p>
			<?php else : ?>
				<div class="siteradar-note is-bad"><?php echo esc_html( is_array( $last ) && ! empty( $last['message'] ) ? $last['message'] : 'SiteRadar has not answered yet.' ); ?></div>
			<?php endif; ?>

			<?php if ( $configured ) : ?>
				<dl class="siteradar-facts">
					<div><dt>WordPress</dt><dd><?php echo esc_html( get_bloginfo( 'version' ) ); ?></dd></div>
					<div><dt>PHP</dt><dd><?php echo esc_html( PHP_VERSION ); ?></dd></div>
					<div><dt>SEO plugin</dt><dd><?php echo esc_html( $seo && isset( $seo_names[ $seo ] ) ? $seo_names[ $seo ] : 'None found' ); ?></dd></div>
				</dl>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="siteradar-actions">
					<input type="hidden" name="action" value="siteradar_check">
					<?php wp_nonce_field( 'siteradar_check' ); ?>
					<button type="submit" class="siteradar-btn is-secondary">Check connection</button>
				</form>
			<?php endif; ?>
		</section>

		<section class="siteradar-card" aria-labelledby="siteradar-track">
			<h2 id="siteradar-track">Tracking</h2>
			<p>The tracking snippet counts visitors, sources and page-load times for your SiteRadar reports.</p>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="siteradar_save">
				<?php wp_nonce_field( 'siteradar_save' ); ?>
				<label class="siteradar-switch">
					<input type="checkbox" name="siteradar_snippet" value="yes" <?php checked( siteradar_snippet_enabled() ); ?>>
					<span class="track" aria-hidden="true"></span>
					<span class="label">
						<strong>Add the tracking snippet to every page automatically</strong>
						<span>Keep this on unless you have already pasted the snippet into your theme or a tag manager. If you use a caching plugin, clear its cache after changing this. Visits by signed-in editors and administrators are not counted.</span>
					</span>
				</label>
				<div class="siteradar-actions">
					<button type="submit" class="siteradar-btn is-primary">Save changes</button>
				</div>
			</form>
		</section>
	</div>
	<?php
}
