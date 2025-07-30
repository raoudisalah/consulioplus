@php
  $permission = App\Http\Helpers\VendorPermissionHelper::packagePermission(Auth::guard('vendor')->user()->id);
  $defaultLang = App\Models\Language::where('is_default', 1)->first();
@endphp

<style>
/* Large Icon Sections Styling */
.sidebar-large-section {
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 15px;
  margin: 10px 8px;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.1);
}

.sidebar-large-section:hover {
  background: rgba(255,255,255,0.1);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}

.sidebar-large-icon {
  width: 60px;
  height: 60px;
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px auto;
  color: white;
  font-size: 26px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  transition: all 0.3s ease;
}

.sidebar-large-icon:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.3);
}

.sidebar-section-title {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 8px;
  color: var(--bs-body-color, #333) !important;
  text-decoration: none !important;
}

/* Color schemes for different sections */
.icon-quick-actions { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.icon-management { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.icon-appointments { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.icon-client-support { background: linear-gradient(135deg, #ff9a56 0%, #ffad56 100%); }
.icon-settings { background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%); }

/* Submenu Grid Styling */
.submenu-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 15px;
  padding: 0 10px;
}

.submenu-item {
  background: rgba(255,255,255,0.05);
  border-radius: 10px;
  padding: 12px;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.1);
  text-decoration: none;
  color: inherit;
}

.submenu-item:hover {
  background: rgba(255,255,255,0.15);
  transform: translateY(-2px);
  color: inherit;
  text-decoration: none;
}

.submenu-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8px auto;
  color: white;
  font-size: 18px;
}

.submenu-text {
  font-size: 11px;
  font-weight: 600;
  color: var(--bs-body-color, #333) !important;
  text-decoration: none !important;
  line-height: 1.2;
}

/* Settings Grid - 3 columns for more items */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 15px;
  padding: 0 5px;
}

.settings-item {
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.1);
  text-decoration: none;
  color: inherit;
}

.settings-item:hover {
  background: rgba(255,255,255,0.15);
  transform: translateY(-1px);
  color: inherit;
  text-decoration: none;
}

.settings-icon {
  width: 35px;
  height: 35px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 5px auto;
  color: white;
  font-size: 16px;
}

.settings-text {
  font-size: 9px;
  font-weight: 600;
  color: var(--bs-body-color, #333) !important;
  text-decoration: none !important;
  line-height: 1.1;
}

/* Dark theme specific styles */
[data-background-color="dark2"] .sidebar-section-title,
[data-background-color="dark2"] .submenu-text,
[data-background-color="dark2"] .settings-text {
  color: white !important;
}

/* Light theme specific styles */
[data-background-color="white"] .sidebar-section-title,
[data-background-color="white"] .submenu-text,
[data-background-color="white"] .settings-text {
  color: #333 !important;
}

/* Logout button styling */
.logout-section {
  margin: 15px 10px;
  text-align: center;
}

.logout-btn {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  color: white;
  padding: 12px 25px;
  border-radius: 20px;
  text-decoration: none;
  font-weight: 700;
  transition: all 0.3s ease;
  display: inline-block;
  box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.logout-btn:hover {
  background: linear-gradient(135deg, #ff5252 0%, #d63031 100%);
  color: white;
  text-decoration: none;
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(255, 107, 107, 0.6);
}
</style>

<div class="sidebar sidebar-style-2"
  data-background-color="{{ Session::get('vendor_theme_version') == 'light' ? 'white' : 'dark2' }}">
  <div class="sidebar-wrapper scrollbar scrollbar-inner">
    <div class="sidebar-content">
      <div class="user">
        <div class="avatar-sm float-left mr-2">
          @if (Auth::guard('vendor')->user()->photo != null)
            <img src="{{ asset('assets/admin/img/vendor-photo/' . Auth::guard('vendor')->user()->photo) }}"
              alt="Vendor Image" class="avatar-img rounded-circle">
          @else
            <img src="{{ asset('assets/img/blank-user.jpg') }}" alt="" class="avatar-img rounded-circle">
          @endif
        </div>

        <div class="info">
          <a data-toggle="collapse" href="#vendorProfileMenu" aria-expanded="true">
            <span>
              {{ Auth::guard('vendor')->user()->username }}
              <span class="user-level">Vendor</span>
              <span class="caret"></span>
            </span>
          </a>

          <div class="clearfix"></div>

          <div class="collapse in" id="vendorProfileMenu">
            <ul class="nav">
              <li>
                <a href="{{ route('vendor.edit.profile') }}">
                  <span class="link-collapse">Edit Profile</span>
                </a>
              </li>

              <li>
                <a href="{{ route('vendor.change_password') }}">
                  <span class="link-collapse">Change Password</span>
                </a>
              </li>

              <li>
                <a href="{{ route('vendor.logout') }}">
                  <span class="link-collapse">Logout</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {{-- search --}}
      <div class="row mb-3" style="margin: 20px 10px;">
        <div class="col-12">
          <form>
            <div class="form-group py-0">
              <input name="term" type="text" class="form-control sidebar-search ltr"
                placeholder="Search Menu Here...">
            </div>
          </form>
        </div>
      </div>

      {{-- 1. Quick Actions Section --}}
      <div class="sidebar-large-section" data-toggle="collapse" data-target="#quickActionsMenu">
        <div class="sidebar-large-icon icon-quick-actions">
          <i class="fas fa-bolt"></i>
        </div>
        <div class="sidebar-section-title">Quick Actions</div>
      </div>
      
      <div class="collapse @if(request()->routeIs('vendor.booking.inquiry') || request()->routeIs('vendor.file_manager') || request()->routeIs('vendor.chat') || request()->routeIs('vendor.ai-support')) show @endif" id="quickActionsMenu">
        <div class="submenu-grid">
          <a href="{{ route('vendor.booking.inquiry', ['language' => $defaultLang->code]) }}" class="submenu-item @if(request()->routeIs('vendor.booking.inquiry')) active @endif">
            <div class="submenu-icon icon-quick-actions">
              <i class="fas fa-comment"></i>
            </div>
            <div class="submenu-text">Service Inquiry</div>
          </a>
          <a href="{{ route('vendor.file_manager') }}" class="submenu-item @if(request()->routeIs('vendor.file_manager')) active @endif">
            <div class="submenu-icon icon-quick-actions">
              <i class="fal fa-file"></i>
            </div>
            <div class="submenu-text">File Manager</div>
          </a>
          <a href="{{ route('vendor.chat') }}" class="submenu-item @if(request()->routeIs('vendor.chat')) active @endif">
            <div class="submenu-icon icon-quick-actions">
              <i class="fab fa-whatsapp"></i>
            </div>
            <div class="submenu-text">Chat Support</div>
          </a>
          <a href="{{ route('vendor.ai-support') }}" class="submenu-item @if(request()->routeIs('vendor.ai-support')) active @endif">
            <div class="submenu-icon icon-quick-actions">
              <i class="fab fa-waze"></i>
            </div>
            <div class="submenu-text">Consulio AI</div>
          </a>
        </div>
      </div>

      {{-- 2. Management Section --}}
      <div class="sidebar-large-section" data-toggle="collapse" data-target="#managementMenu">
        <div class="sidebar-large-icon icon-management">
          <i class="fas fa-cogs"></i>
        </div>
        <div class="sidebar-section-title">Management</div>
      </div>
      
      <div class="collapse @if(request()->routeIs('vendor.service_managment*') || request()->routeIs('vendor.staff_managment*') || request()->routeIs('featured.service.*')) show @endif" id="managementMenu">
        <div class="submenu-grid">
          <a href="{{ route('vendor.service_managment', ['language' => $defaultLang->code]) }}" class="submenu-item @if(request()->routeIs('vendor.service_managment') && !request()->routeIs('vendor.service_managment.create')) active @endif">
            <div class="submenu-icon icon-management">
              <i class="fas fa-wrench"></i>
            </div>
            <div class="submenu-text">Services</div>
          </a>
          <a href="{{ route('vendor.service_managment.create') }}" class="submenu-item @if(request()->routeIs('vendor.service_managment.create')) active @endif">
            <div class="submenu-icon icon-management">
              <i class="fas fa-plus"></i>
            </div>
            <div class="submenu-text">Add Service</div>
          </a>
          <a href="{{ route('vendor.clients.elenco') }}" class="submenu-item @if(request()->routeIs('vendor.clients.elenco')) active @endif">
    <div class="submenu-icon icon-management">
        <i class="fas fa-address-book"></i>
    </div>
    <div class="submenu-text">I Miei Clienti</div>
</a>
          <a href="{{ route('vendor.staff_managment', ['language' => $defaultLang->code]) }}" class="submenu-item @if(request()->routeIs('vendor.staff_managment') && !request()->routeIs('vendor.staff_managment.create')) active @endif">
            <div class="submenu-icon icon-management">
              <i class="fas fa-users"></i>
            </div>
            <div class="submenu-text">Staff</div>
          </a>
          <a href="{{ route('vendor.staff_managment.create') }}" class="submenu-item @if(request()->routeIs('vendor.staff_managment.create')) active @endif">
            <div class="submenu-icon icon-management">
              <i class="fas fa-user-plus"></i>
            </div>
            <div class="submenu-text">Add Staff</div>
          </a>
        </div>
      </div>

      {{-- 3. Appointments Section --}}
      <div class="sidebar-large-section" data-toggle="collapse" data-target="#appointmentsMenu">
        <div class="sidebar-large-icon icon-appointments">
          <i class="fas fa-calendar-alt"></i>
        </div>
        <div class="sidebar-section-title">Appointments</div>
      </div>
      
      <div class="collapse @if(request()->routeIs('vendor.staff.global.day') || request()->routeIs('vendor.global.holiday') || request()->routeIs('vendor.*_appointment*')) show @endif" id="appointmentsMenu">
        <div class="submenu-grid">
          <a href="{{ route('vendor.staff.global.day') }}" class="submenu-item @if(request()->routeIs('vendor.staff.global.day')) active @endif">
            <div class="submenu-icon icon-appointments">
              <i class="fas fa-calendar-day"></i>
            </div>
            <div class="submenu-text">Schedule Days</div>
          </a>
          <a href="{{ route('vendor.global.holiday') }}" class="submenu-item @if(request()->routeIs('vendor.global.holiday')) active @endif">
            <div class="submenu-icon icon-appointments">
              <i class="fas fa-calendar-times"></i>
            </div>
            <div class="submenu-text">Holidays</div>
          </a>
          <a href="{{ route('vendor.all_appointment', ['language' => $defaultLang->code]) }}" class="submenu-item @if(request()->routeIs('vendor.all_appointment')) active @endif">
            <div class="submenu-icon icon-appointments">
              <i class="fas fa-calendar-check"></i>
            </div>
            <div class="submenu-text">All Appointments</div>
          </a>
          <a href="{{ route('vendor.pending_appointment', ['language' => $defaultLang->code]) }}" class="submenu-item @if(request()->routeIs('vendor.pending_appointment')) active @endif">
            <div class="submenu-icon icon-appointments">
              <i class="fas fa-clock"></i>
            </div>
            <div class="submenu-text">Pending</div>
          </a>
          <a href="{{ route('vendor.accepted_appointment', ['language' => $defaultLang->code]) }}" class="submenu-item @if(request()->routeIs('vendor.accepted_appointment')) active @endif">
            <div class="submenu-icon icon-appointments">
              <i class="fas fa-check-circle"></i>
            </div>
            <div class="submenu-text">Accepted</div>
          </a>
          <a href="{{ route('vendor.rejected_appointment', ['language' => $defaultLang->code]) }}" class="submenu-item @if(request()->routeIs('vendor.rejected_appointment')) active @endif">
            <div class="submenu-icon icon-appointments">
              <i class="fas fa-times-circle"></i>
            </div>
            <div class="submenu-text">Rejected</div>
          </a>
        </div>
      </div>

      {{-- 4. Client Support Section --}}
      <div class="sidebar-large-section" data-toggle="collapse" data-target="#clientSupportMenu">
        <div class="sidebar-large-icon icon-client-support">
          <i class="fas fa-headset"></i>
        </div>
        <div class="sidebar-section-title">Client Support</div>
      </div>
      
      <div class="collapse @if(request()->routeIs('vendor.support_ticket*') || request()->routeIs('vendor.chat')) show @endif" id="clientSupportMenu">
        <div class="submenu-grid">
          @if ($permission != '[]' && $permission->support_ticket_status == 1)
          <a href="{{ route('vendor.support_tickets') }}" class="submenu-item @if(request()->routeIs('vendor.support_tickets')) active @endif">
            <div class="submenu-icon icon-client-support">
              <i class="fas fa-ticket-alt"></i>
            </div>
            <div class="submenu-text">All Tickets</div>
          </a>
          <a href="{{ route('vendor.support_ticket.create') }}" class="submenu-item @if(request()->routeIs('vendor.support_ticket.create')) active @endif">
            <div class="submenu-icon icon-client-support">
              <i class="fas fa-plus-circle"></i>
            </div>
            <div class="submenu-text">Add Ticket</div>
          </a>
          @endif
          <a href="{{ route('vendor.chat') }}" class="submenu-item @if(request()->routeIs('vendor.chat')) active @endif">
            <div class="submenu-icon icon-client-support">
              <i class="fab fa-whatsapp"></i>
            </div>
            <div class="submenu-text">Chat Support</div>
          </a>
        </div>
      </div>

      {{-- 5. Settings Section --}}
      <div class="sidebar-large-section" data-toggle="collapse" data-target="#settingsMenu">
        <div class="sidebar-large-icon icon-settings">
          <i class="fas fa-cog"></i>
        </div>
        <div class="sidebar-section-title">Settings</div>
      </div>
      
      <div class="collapse @if(request()->routeIs('vendor.email.index') || request()->routeIs('vendor.withdraw*') || request()->routeIs('vendor.transaction') || request()->routeIs('vendor.plugins.index') || request()->routeIs('vendor.plan.extend*') || request()->routeIs('vendor.subscription_log') || request()->routeIs('vendor.edit.profile') || request()->routeIs('vendor.change_password')) show @endif" id="settingsMenu">
        <div class="settings-grid">
          <a href="{{ route('vendor.email.index') }}" class="settings-item @if(request()->routeIs('vendor.email.index')) active @endif">
            <div class="settings-icon icon-settings">
              <i class="fas fa-envelope"></i>
            </div>
            <div class="settings-text">Recipient Mail</div>
          </a>
          <a href="{{ route('vendor.withdraw') }}" class="settings-item @if(request()->routeIs('vendor.withdraw*')) active @endif">
            <div class="settings-icon icon-settings">
              <i class="fas fa-money-bill-wave"></i>
            </div>
            <div class="settings-text">Request Withdrawal</div>
          </a>
          <a href="{{ route('vendor.transaction') }}" class="settings-item @if(request()->routeIs('vendor.transaction')) active @endif">
            <div class="settings-icon icon-settings">
              <i class="fas fa-exchange-alt"></i>
            </div>
            <div class="settings-text">Transactions</div>
          </a>
          @if ($permission != '[]' && $permission->calendar_status == 1)
          <a href="{{ route('vendor.plugins.index') }}" class="settings-item @if(request()->routeIs('vendor.plugins.index')) active @endif">
            <div class="settings-icon icon-settings">
              <i class="fas fa-plug"></i>
            </div>
            <div class="settings-text">Plugins</div>
          </a>
          @endif
          <a href="{{ route('vendor.plan.extend.index') }}" class="settings-item @if(request()->routeIs('vendor.plan.extend*')) active @endif">
            <div class="settings-icon icon-settings">
              <i class="fas fa-shopping-cart"></i>
            </div>
            <div class="settings-text">Buy Plan</div>
          </a>
          <a href="{{ route('vendor.subscription_log') }}" class="settings-item @if(request()->routeIs('vendor.subscription_log')) active @endif">
            <div class="settings-icon icon-settings">
              <i class="fas fa-file-invoice-dollar"></i>
            </div>
            <div class="settings-text">Subscription Logs</div>
          </a>
          <a href="{{ route('vendor.edit.profile') }}" class="settings-item @if(request()->routeIs('vendor.edit.profile')) active @endif">
            <div class="settings-icon icon-settings">
              <i class="fas fa-user-edit"></i>
            </div>
            <div class="settings-text">Edit Profile</div>
          </a>
          <a href="{{ route('vendor.change_password') }}" class="settings-item @if(request()->routeIs('vendor.change_password')) active @endif">
            <div class="settings-icon icon-settings">
              <i class="fas fa-key"></i>
            </div>
            <div class="settings-text">Change Password</div>
          </a>
        </div>
      </div>

      {{-- 6. Logout Section --}}
      <div class="logout-section">
        <a href="{{ route('vendor.logout') }}" class="logout-btn">
          <i class="fas fa-sign-out-alt"></i> Logout
        </a>
      </div>

    </div>
  </div>
</div>

