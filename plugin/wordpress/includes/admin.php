<?php
/**
 * Settings page: the SiteRadar item in the admin menu. Styled like the SiteRadar dashboard. Shows whether the connection works and lets the owner switch the tracking snippet off.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function siteradar_admin_menu() {
	// Its own item in the admin menu. The icon is set in siteradar_menu_icon_css(): WordPress repaints icons it is given as data URIs, which turns the orange square white.
	add_menu_page( 'SiteRadar', 'SiteRadar', 'manage_options', 'siteradar', 'siteradar_render_page', 'none', 80 );
	// Two pages under it. The first uses the same slug as the menu itself, so it replaces the automatic duplicate "SiteRadar" entry.
	add_submenu_page( 'siteradar', 'SiteRadar settings', 'Settings', 'manage_options', 'siteradar', 'siteradar_render_page' );
	add_submenu_page( 'siteradar', 'SiteRadar fixes', 'Fixes', 'manage_options', 'siteradar-fixes', 'siteradar_render_fixes' );
}

/**
 * The menu icon: the SiteRadar orange square with the white logo, kept in its own colors on every admin page.
 */
function siteradar_menu_icon_css() {
	$icon = esc_url( plugins_url( 'assets/siteradar-icon.svg', SITERADAR_FILE ) );
	echo '<style id="siteradar-menu-icon">#adminmenu .toplevel_page_siteradar div.wp-menu-image{background:url(' . $icon . ') center / 20px 20px no-repeat;opacity:1}#adminmenu .toplevel_page_siteradar div.wp-menu-image:before{display:none}</style>';
}

/**
 * The stylesheet is loaded on this page only, so it can never change how the rest of the admin looks.
 */
function siteradar_admin_assets( $hook ) {
	if ( false === strpos( (string) $hook, 'siteradar' ) ) {
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

/**
 * The Fixes page: every fix SiteRadar can apply to this website and whether it is switched on in the SiteRadar account.
 */
function siteradar_render_fixes() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$logo    = plugins_url( 'assets/siteradar-logo.svg', SITERADAR_FILE );
	$catalog = siteradar_fix_catalog();
	$active  = siteradar_active_fixes();
	$idle    = array_values( array_diff( array_keys( $catalog ), $active ) );
	?>
	<div class="wrap siteradar-wrap">
		<div class="siteradar-head">
			<img src="<?php echo esc_url( $logo ); ?>" alt="SiteRadar">
			<span class="siteradar-version">Plugin version <?php echo esc_html( SITERADAR_VERSION ); ?></span>
		</div>
		<h1 class="screen-reader-text">SiteRadar fixes</h1>
		<hr class="wp-header-end">

		<section class="siteradar-card" aria-labelledby="siteradar-active">
			<div class="siteradar-title">
				<h2 id="siteradar-active">Fixes applied to this website</h2>
				<span class="siteradar-chip <?php echo $active ? 'is-ok' : 'is-warn'; ?>"><?php echo esc_html( count( $active ) ); ?> active</span>
			</div>
			<?php if ( $active ) : ?>
				<p>These fixes were switched on in your SiteRadar account and are active on this website now. To remove one, undo it from the Audit tab in SiteRadar.</p>
				<ul class="siteradar-fixlist">
					<?php foreach ( $active as $siteradar_name ) : ?>
						<li>
							<span class="siteradar-fixtext"><strong><?php echo esc_html( $catalog[ $siteradar_name ][0] ); ?></strong><span><?php echo esc_html( $catalog[ $siteradar_name ][1] ); ?></span></span>
							<span class="siteradar-chip is-ok">Active</span>
						</li>
					<?php endforeach; ?>
				</ul>
				<p class="siteradar-muted">If you use a caching plugin, clear its cache so visitors get the change at once.</p>
			<?php else : ?>
				<p>No fixes are switched on yet. Open this website in SiteRadar, go to the Audit tab and press <strong>Fix this issue</strong> on a finding. It will show up here within a few seconds.</p>
			<?php endif; ?>
		</section>

		<?php if ( $idle ) : ?>
			<section class="siteradar-card" aria-labelledby="siteradar-idle">
				<h2 id="siteradar-idle">Other fixes SiteRadar can apply</h2>
				<p>These are not switched on. They appear as <strong>Fix this issue</strong> buttons in SiteRadar when an audit finds the matching problem.</p>
				<ul class="siteradar-fixlist is-idle">
					<?php foreach ( $idle as $siteradar_name ) : ?>
						<li>
							<span class="siteradar-fixtext"><strong><?php echo esc_html( $catalog[ $siteradar_name ][0] ); ?></strong><span><?php echo esc_html( $catalog[ $siteradar_name ][1] ); ?></span></span>
							<span class="siteradar-chip is-warn">Not on</span>
						</li>
					<?php endforeach; ?>
				</ul>
			</section>
		<?php endif; ?>
	</div>
	<?php
}
