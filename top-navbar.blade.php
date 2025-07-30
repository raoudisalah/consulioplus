@php
  use App\Http\Helpers\CheckLimitHelper;
  use App\Http\Helpers\VendorPermissionHelper;
  $infoIcon = false;
  $vendor_id = Auth::guard('vendor')->user()->id;
  $currentPackage = VendorPermissionHelper::currentPackagePermission($vendor_id);
  $services = CheckLimitHelper::serviceLimit($vendor_id) - CheckLimitHelper::countService($vendor_id);

  $totalServices = CheckLimitHelper::countService($vendor_id);
  $appointments = CheckLimitHelper::countAppointment($vendor_id);

  $staffs = CheckLimitHelper::staffLimit($vendor_id) - vendorTotalAddedStaff($vendor_id);

  //image down graded
  $serviceIds = CheckLimitHelper::countImage($vendor_id);
  $imageLimitCount = count($serviceIds);

  if ($services < 0 || $staffs < 0 || $imageLimitCount > 0 || $appointments < 0) {
      $infoIcon = true;
  }
@endphp

<style>
/* Meeting in Person Button Styling */
.meeting-in-person-btn {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  border: 2px solid #ff6b6b;
  color: white !important;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 25px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
  text-decoration: none !important;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  animation: pulse-glow 2s infinite;
  margin-right: 10px;
}

.meeting-in-person-btn:hover {
  background: linear-gradient(135deg, #ff5252 0%, #d63031 100%);
  color: white !important;
  text-decoration: none !important;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
}

@keyframes pulse-glow {
  0% {
    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
  }
  50% {
    box-shadow: 0 6px 25px rgba(255, 107, 107, 0.6);
  }
  100% {
    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
  }
}

/* Dashboard Button Styling */
.dashboard-btn {
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  border: 2px solid #007bff;
  color: white !important;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 25px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
  text-decoration: none !important;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-right: 10px;
}

.dashboard-btn:hover {
  background: linear-gradient(135deg, #0056b3 0%, #004085 100%);
  color: white !important;
  text-decoration: none !important;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(0, 123, 255, 0.4);
}

/* Consultant Button Styling */
.consultant-btn {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  border: 2px solid #28a745;
  color: white !important;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 25px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
  text-decoration: none !important;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.consultant-btn:hover {
  background: linear-gradient(135deg, #218838 0%, #1e7e34 100%);
  color: white !important;
  text-decoration: none !important;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
}

.consultant-dropdown .dropdown-menu {
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  border: none;
  padding: 10px 0;
}

.consultant-dropdown .dropdown-item {
  padding: 8px 20px;
  transition: all 0.3s ease;
  color: #333;
  font-weight: 500;
  font-size: 13px;
}

.consultant-dropdown .dropdown-item:hover {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
  transform: translateX(3px);
}
</style>

<div class="main-header">
  <!-- Logo Header Start -->
  <div class="logo-header"
    data-background-color="{{ Session::get('vendor_theme_version') == 'light' ? 'white' : 'dark2' }}">

    @if (!empty($websiteInfo->logo))
      <a href="{{ route('index') }}" class="logo" target="_blank">
        <img src="{{ asset('assets/img/' . $websiteInfo->logo) }}" alt="logo" class="navbar-brand" width="120">
      </a>
    @endif

    <button class="navbar-toggler sidenav-toggler ml-auto" type="button" data-toggle="collapse" data-target="collapse"
      aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon">
        <i class="icon-menu"></i>
      </span>
    </button>
    <button class="topbar-toggler more"><i class="icon-options-vertical"></i></button>

    <div class="nav-toggle">
      <button class="btn btn-toggle toggle-sidebar">
        <i class="icon-menu"></i>
      </button>
    </div>
  </div>
  <!-- Logo Header End -->

  <!-- Navbar Header Start -->
  <nav class="navbar navbar-header navbar-expand-lg"
    data-background-color="{{ Session::get('vendor_theme_version') == 'light' ? 'white2' : 'dark' }}">
    <div class="container-fluid">
      
      <!-- Left Side Buttons -->
      <div class="navbar-nav mr-auto">
        <a href="{{ route('vendor.dashboard') }}" class="dashboard-btn">
          <i class="fas fa-tachometer-alt"></i>
          Dashboard
        </a>
        <a href="{{ route('vendor.ai-support') }}" class="meeting-in-person-btn">
          <i class="fas fa-handshake"></i>
          Meeting in Person
        </a>
      </div>

      <ul class="navbar-nav topbar-nav ml-md-auto align-items-center">
        
        <!-- Consultant Dropdown -->
        <li class="nav-item dropdown consultant-dropdown">
          <a class="consultant-btn dropdown-toggle" data-toggle="dropdown" href="#" aria-expanded="false">
            <i class="fas fa-user-tie"></i>
            CONSULTANT
            <i class="fas fa-chevron-down ml-1"></i>
          </a>
          <ul class="dropdown-menu dropdown-menu-right animated fadeIn">
            <li><a class="dropdown-item" href="{{ route('vendor.service_managment', ['language' => app()->getLocale()]) }}">Services</a></li>
            <li><a class="dropdown-item" href="{{ route('vendor.staff_managment', ['language' => app()->getLocale()]) }}">Team Management</a></li>
            <li><a class="dropdown-item" href="{{ route('vendor.all_appointment', ['language' => app()->getLocale()]) }}">Appointments</a></li>
            <li><a class="dropdown-item" href="{{ route('vendor.staff.global.day') }}">Schedule</a></li>
            <li><a class="dropdown-item" href="{{ route('vendor.transaction') }}">Payments</a></li>
            <li><a class="dropdown-item" href="{{ route('vendor.booking.inquiry', ['language' => app()->getLocale()]) }}">Service Inquiry</a></li>
          </ul>
        </li>

        @if ($currentPackage)
          <li class="nav-item" id="limitDiv">
            <a class="btn btn-primary btn-sm btn-round" data-toggle="modal" data-target="#limitModal"
              href="javascript::void()" id="limitBtn">
              @if ($infoIcon == true)
                <span class="text-danger">
                  <i class="fas fa-exclamation-triangle text-danger"></i>
                </span>
              @endif
              {{ __('Check Limit') }}
            </a>
          </li>
        @endif
        
        <li>
          <a class="btn btn-primary btn-sm btn-round" target="_blank"
            href="{{ route('frontend.vendor.details', ['username' => Auth::guard('vendor')->user()->username]) }}"
            title="View Profile">
            <i class="fas fa-eye"></i>
          </a>
        </li>
        
        <form action="{{ route('vendor.change_theme') }}" class="form-inline mr-3" method="POST">
          @csrf
          <div class="form-group">
            <div class="selectgroup selectgroup-secondary selectgroup-pills">
              <label class="selectgroup-item">
                <input type="radio" name="vendor_theme_version" value="light" class="selectgroup-input"
                  {{ Session::get('vendor_theme_version') == 'light' ? 'checked' : '' }} onchange="this.form.submit()">
                <span class="selectgroup-button selectgroup-button-icon"><i class="fa fa-sun"></i></span>
              </label>
              <label class="selectgroup-item">
                <input type="radio" name="vendor_theme_version" value="dark" class="selectgroup-input"
                  {{ !Session::has('vendor_theme_version') || Session::get('vendor_theme_version') == 'dark' ? 'checked' : '' }}
                  onchange="this.form.submit()">
                <span class="selectgroup-button selectgroup-button-icon"><i class="fa fa-moon"></i></span>
              </label>
            </div>
          </div>
        </form>

        <li class="nav-item dropdown hidden-caret">
          <a class="dropdown-toggle profile-pic" data-toggle="dropdown" href="#" aria-expanded="false">
            <div class="avatar-sm">
              @if (Auth::guard('vendor')->user()->photo != null)
                <img src="{{ asset('assets/admin/img/vendor-photo/' . Auth::guard('vendor')->user()->photo) }}"
                  alt="Vendor Image" class="avatar-img rounded-circle">
              @else
                <img src="{{ asset('assets/img/blank-user.jpg') }}" alt="" class="avatar-img rounded-circle">
              @endif
            </div>
          </a>

          <ul class="dropdown-menu dropdown-user animated fadeIn">
            <div class="dropdown-user-scroll scrollbar-outer">
              <li>
                <div class="user-box">
                  <div class="avatar-lg">
                    @if (Auth::guard('vendor')->user()->photo != null)
                      <img src="{{ asset('assets/admin/img/vendor-photo/' . Auth::guard('vendor')->user()->photo) }}"
                        alt="Vendor Image" class="avatar-img rounded-circle">
                    @else
                      <img src="{{ asset('assets/img/blank-user.jpg') }}" alt=""
                        class="avatar-img rounded-circle">
                    @endif
                  </div>

                  <div class="u-text">
                    <h4>
                      {{ Auth::guard('vendor')->user()->username }}
                    </h4>
                    <p class="text-muted">{{ Auth::guard('vendor')->user()->email }}</p>
                  </div>
                </div>
              </li>

              <li>
                <div class="dropdown-divider"></div>
                <a class="dropdown-item" href="{{ route('vendor.edit.profile') }}">
                  {{ __('Edit Profile') }}
                </a>

                <div class="dropdown-divider"></div>
                <a class="dropdown-item" href="{{ route('vendor.change_password') }}">
                  {{ __('Change Password') }}
                </a>

                <div class="dropdown-divider"></div>
                <a class="dropdown-item" href="{{ route('vendor.logout') }}">
                  {{ __('Logout') }}
                </a>
              </li>
            </div>
          </ul>
        </li>
      </ul>
    </div>
  </nav>
  <!-- Navbar Header End -->
</div>

@includeIf('vendors.partials.limit-modal')

