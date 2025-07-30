<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Models\Vendor;
use App\Http\Controllers\AISupportController;
use App\Http\Controllers\AiCoPilotController; // Aggiunto questo use statement

// RIMOSSO: Auth::routes(); - Questa riga causava l'errore LoginController

Route::post("/vendor/chatgpt/send", [AISupportController::class, "store"])->name("vendor.chatgpt.send");

Route::post("/ai-vendor", function (Request $request) {
    $userInput = $request->input("problem");

    $vendors = Vendor::all();
    $vendorList = $vendors->map(function($v) { return $v->name . " - " . $v->specialization; })->implode("\\n");

    $response = Http::withHeaders([
        "Authorization" => "Bearer " . env("OPENAI_API_KEY"),
        "Content-Type"  => "application/json",
    ])->post("https://api.openai.com/v1/chat/completions", [
        "model" => "gpt-4",
        "messages" => [
            ["role" => "system", "content" => "Ecco un elenco di vendors disponibili:\\n$vendorList"],
            ["role" => "user", "content" => $userInput],
        ],
        "max_tokens" => 100,
    ]);

    return response()->json($response->json());
});

Broadcast::routes(["middleware" => ["web","multiauth"]]);

/*
|--------------------------------------------------------------------------
| User Interface Routes
|--------------------------------------------------------------------------
*/

Route::get("/subcheck", "CronJobController@expired")->name("cron.expired");
Route::get("/change-language", "FrontEnd\\MiscellaneousController@changeLanguage")->name("change_language");
Route::post("/store-subscriber", "FrontEnd\\MiscellaneousController@storeSubscriber")->name("store_subscriber");
Route::get("/offline", "FrontEnd\\HomeController@offline")->middleware("change.lang");

Route::middleware("change.lang")->group(function () {
  Route::get("/", "FrontEnd\\HomeController@index")->name("index");

  Route::prefix("services")->group(function () {
    Route::get("/", "FrontEnd\\Services\\ServiceController@index")->name("frontend.services");
    Route::get("addto/wishlist/{id}", "FrontEnd\\UserController@add_to_wishlist")->name("addto.wishlist");
    Route::get("remove/wishlist/{id}", "FrontEnd\\UserController@remove_wishlist")->name("remove.wishlist");
    Route::get("service/search", "FrontEnd\\Services\\ServiceController@searchService")->name("frontend.services.category.search");
    Route::post("service/store-review/{id}", "FrontEnd\\Services\\ServiceController@storeReview")->name("frontend.service.rating.store");
    Route::post("contact/message", "FrontEnd\\Services\\ServiceController@message")->name("frontend.services.contact.message");
    Route::get("/details/{slug}/{id}", "FrontEnd\\Services\\ServiceController@details")->name("frontend.service.details");
    Route::get("services-staff-content/{id}", "FrontEnd\\Services\\ServiceController@staffcontent")->name("frontend.service.content");
    Route::get("billing-form", "FrontEnd\\Services\\ServiceController@billing")->name("frontend.services.billing");
    Route::get("payment-success/{id}", "FrontEnd\\Services\\ServiceController@paymentSuccess")->name("frontend.service.payment.success");
    Route::get("show-staff-hour/{id}", "FrontEnd\\Services\\ServiceController@staffHour")->name("frontend.staff.hour");
    Route::get("staff-date-time/{id}", "FrontEnd\\Services\\ServiceController@staffHoliday")->name("frontend.staff.holiday");
    Route::post("login", "FrontEnd\\Services\\ServiceController@login")->name("frontend.user.login");
    Route::get("staff/search/{id}", "FrontEnd\\Services\\ServiceController@staffSearch")->name("frontend.staff.search");
    Route::post("session/forget", "FrontEnd\\Services\\ServiceController@sessionForget")->name("service.session.forget");
    Route::post("payment/process/", "FrontEnd\\Booking\\ServicePaymentController@index")->name("frontend.service.payment");
    Route::get("/paypal/payment/notify", "FrontEnd\\Booking\\Payment\\PayPalController@notify")->name("frontend.service_booking.paypal.notify");
    Route::post("/razorpay/payment/notify", "FrontEnd\\Booking\\Payment\\RazorpayController@notify")->name("frontend.service_booking.razorpay.notify");
    Route::get("/flutterwave/payment/notify", "FrontEnd\\Booking\\Payment\\FlutterwaveController@notify")->name("frontend.service_booking.flutterwave.notify");
    Route::get("/instamojo/payment/notify", "FrontEnd\\Booking\\Payment\\InstamojoController@notify")->name("frontend.service_booking.instamojo.notify");
    Route::get(
      "/mollie/payment/notify",
      "FrontEnd\\Booking\\Payment\\MollieController@notify"
    )->name("frontend.service_booking.mollie.notify");
    Route::get("/paystack/payment/notify", "FrontEnd\\Booking\\Payment\\PaystackController@notify")->name("frontend.service_booking.paystack.notify");
    Route::get("/mercadopago/payment/notify", "FrontEnd\\Booking\\Payment\\MercadoPagoController@notify")->name("frontend.service_booking.mercadopago.notify");
    Route::post("/paytm/payment/notify", "FrontEnd\\Booking\\Payment\\PaytmController@notify")->name("frontend.service_booking.paytm.notify");
    Route::get("/booking/complete/popup", "FrontEnd\\Booking\\ServicePaymentController@complete")->name("frontend.service.booking.complete");
    Route::get("/cancel", "FrontEnd\\Booking\\ServicePaymentController@cancel")->name("frontend.service_booking.cancel");
  });

  Route::get("/products", "FrontEnd\\Shop\\ProductController@index")->name("shop.products")->middleware("shop.status");
  Route::prefix("/product")->middleware(["shop.status"])->group(function () {
    Route::get("/{slug}", "FrontEnd\\Shop\\ProductController@show")->name("shop.product_details");
    Route::get("/{id}/add-to-cart/{quantity}", "FrontEnd\\Shop\\ProductController@addToCart")->name("shop.product.add_to_cart");
  });

  Route::prefix("/shop")->middleware(["shop.status"])->group(function () {
    Route::get("/cart", "FrontEnd\\Shop\\ProductController@cart")->name("shop.cart");
    Route::post("/update-cart", "FrontEnd\\Shop\\ProductController@updateCart")->name("shop.update_cart");
    Route::get("/cart/remove-product/{id}", "FrontEnd\\Shop\\ProductController@removeProduct")->name("shop.cart.remove_product");
    Route::get("put-shipping-method-id/{id}", "FrontEnd\\Shop\\ProductController@put_shipping_method")->name("put-shipping-method-id");
    Route::prefix("/checkout")->group(function () {
      Route::get("", "FrontEnd\\Shop\\ProductController@checkout")->name("shop.checkout");
      Route::post("/apply-coupon", "FrontEnd\\Shop\\ProductController@applyCoupon");
      Route::get("/offline-gateway/{id}/check-attachment", "FrontEnd\\Shop\\ProductController@checkAttachment");
    });

    Route::prefix("/purchase-product")->group(function () {
      Route::post("", "FrontEnd\\Shop\\PurchaseProcessController@index")->name("shop.purchase_product");
      Route::get("/paypal/notify", "FrontEnd\\PaymentGateway\\PayPalController@notify")->name("shop.purchase_product.paypal.notify");
      Route::get("/instamojo/notify", "FrontEnd\\PaymentGateway\\InstamojoController@notify")->name("shop.purchase_product.instamojo.notify");
      Route::get("/paystack/notify", "FrontEnd\\PaymentGateway\\PaystackController@notify")->name("shop.purchase_product.paystack.notify");
      Route::get("/flutterwave/notify", "FrontEnd\\PaymentGateway\\FlutterwaveController@notify")->name("shop.purchase_product.flutterwave.notify");
      Route::post("/razorpay/notify", "FrontEnd\\PaymentGateway\\RazorpayController@notify")->name("shop.purchase_product.razorpay.notify");
      Route::get("/mercadopago/notify", "FrontEnd\\PaymentGateway\\MercadoPagoController@notify")->name("shop.purchase_product.mercadopago.notify");
      Route::get("/mollie/notify", "FrontEnd\\PaymentGateway\\MollieController@notify")->name("shop.purchase_product.mollie.notify");
      Route::post("/paytm/notify", "FrontEnd\\PaymentGateway\\PaytmController@notify")->name("shop.purchase_product.paytm.notify");
      Route::get("/complete/{type?}", "FrontEnd\\Shop\\PurchaseProcessController@complete")->name("shop.purchase_product.complete")->middleware("change.lang");
      Route::get("/cancel", "FrontEnd\\Shop\\PurchaseProcessController@cancel")->name("shop.purchase_product.cancel");
    });
    Route::post("/product/{id}/store-review", "FrontEnd\\Shop\\ProductController@storeReview")->name("shop.product_details.store_review");
  });

  Route::prefix("pricing")->group(function () {
    Route::get("/", "FrontEnd\\PricingController@index")->name("frontend.pricing");
  });

  Route::prefix("vendors")->group(function () {
    Route::get("/", "FrontEnd\\VendorController@index")->name("frontend.vendors");
    Route::post("contact/message", "FrontEnd\\VendorController@contact")->name("vendor.contact.message");
  });
  Route::get("vendor/{username}", "FrontEnd\\VendorController@details")->name("frontend.vendor.details");

  Route::prefix("/blog")->group(function () {
    Route::get("", "FrontEnd\\BlogController@index")->name("blog");
    Route::get("/{slug}", "FrontEnd\\BlogController@show")->name("blog_details");
  });

  Route::get("/faq", "FrontEnd\\FaqController@faq")->name("faq");
  Route::get("/about-us", "FrontEnd\\HomeController@about")->name("about_us");

  Route::prefix("/contact")->group(function () {
    Route::get("", "FrontEnd\\ContactController@contact")->name("contact");
    Route::post("/send-mail", "FrontEnd\\ContactController@sendMail")->name("contact.send_mail")->withoutMiddleware("change.lang");
  });
});

Route::post("/advertisement/{id}/count-view", "FrontEnd\\MiscellaneousController@countAdView");

Route::prefix("login")->middleware(["guest:web", "change.lang"])->group(function () {
  Route::prefix("/user/facebook")->group(function () {
    Route::get("", "FrontEnd\\UserController@redirectToFacebook")->name("user.login.facebook");
    Route::get("/callback", "FrontEnd\\UserController@handleFacebookCallback");
  });

  Route::prefix("/google")->group(function () {
    Route::get("", "FrontEnd\\UserController@redirectToGoogle")->name("user.login.google");
    Route::get("/callback", "FrontEnd\\UserController@handleGoogleCallback");
  });
});

Route::prefix("/user")->middleware(["guest:web", "change.lang"])->group(function () {
  Route::prefix("/login")->group(function () {
    Route::get("", "FrontEnd\\UserController@login")->name("user.login");
  });
  Route::post("/login-submit", "FrontEnd\\UserController@loginSubmit")->name("user.login_submit")->withoutMiddleware("change.lang");
  Route::get("/forget-password", "FrontEnd\\UserController@forgetPassword")->name("user.forget_password");
  Route::post("/send-forget-password-mail", "FrontEnd\\UserController@forgetPasswordMail")->name("user.send_forget_password_mail")->withoutMiddleware("change.lang");
  Route::get("/reset-password", "FrontEnd\\UserController@resetPassword");
  Route::post("/reset-password-submit", "FrontEnd\\UserController@resetPasswordSubmit")->name("user.reset_password_submit")->withoutMiddleware("change.lang");
  Route::get("/signup", "FrontEnd\\UserController@signup")->name("user.signup");
  Route::post("/signup-submit", "FrontEnd\\UserController@signupSubmit")->name("user.signup_submit")->withoutMiddleware("change.lang");
  Route::get("/signup-verify/{token}", "FrontEnd\\UserController@signupVerify")->withoutMiddleware("change.lang");
});

Route::prefix("/user")->middleware(["auth:web", "account.status", "change.lang"])->group(function () {
  Route::get("/dashboard", "FrontEnd\\UserController@redirectToDashboard")->name("user.dashboard");
  Route::get("/wishlist", "FrontEnd\\UserController@wishlist")->name("user.wishlist");
  Route::get("appointment", "FrontEnd\\AppointmentController@appointment")->name("user.appointment.index");
  Route::get("appointment/details/{id}", "FrontEnd\\AppointmentController@details")->name("user.appointment.details");
  Route::get("order", "FrontEnd\\OrderController@index")->name("user.order.index")->middleware("shop.status");
  Route::get("/order/details/{id}", "FrontEnd\\OrderController@details")->name("user.order.details")->middleware("shop.status");
  Route::post("download/{product_id}", "FrontEnd\\OrderController@download")->name("user.product_order.product.download")->middleware("shop.status");
  Route::get("/edit-profile", "FrontEnd\\UserController@editProfile")->name("user.edit_profile");
  Route::post("/update-profile", "FrontEnd\\UserController@updateProfile")->name("user.update_profile")->withoutMiddleware("change.lang");
  Route::get("/change-password", "FrontEnd\\UserController@changePassword")->name("user.change_password");
  Route::post("/update-password", "FrontEnd\\UserController@updatePassword")->name("user.update_password")->withoutMiddleware("change.lang");
  Route::get("/logout", "FrontEnd\\UserController@logoutSubmit")->name("user.logout")->withoutMiddleware("change.lang");
  Route::get("/file_manager", "FileManagerController@user")->name("user.file_manager");
  Route::get("/chat", "ChatController@user")->name("user.chat");
});

Route::get("/service-unavailable", "FrontEnd\\MiscellaneousController@serviceUnavailable")->name("service_unavailable")->middleware("exists.down");

/*
|--------------------------------------------------------------------------
| admin frontend route
|--------------------------------------------------------------------------
*/

Route::prefix("/admin")->middleware("guest:admin")->group(function () {
  Route::get("/", "Admin\\AdminController@login")->name("admin.login");
  Route::post("/auth", "Admin\\AdminController@authentication")->name("admin.auth");
  Route::get("/forget-password", "Admin\\AdminController@forgetPassword")->name("admin.forget_password");
  Route::post("/mail-for-forget-password", "Admin\\AdminController@forgetPasswordMail")->name("admin.mail_for_forget_password");
});

/*
|--------------------------------------------------------------------------
| Gruppo di rotte per utenti autenticati (Admin o Vendor)
|--------------------------------------------------------------------------
*/
Route::group(["middleware" => "multiauth"], function () {
    Route::get("/chat-history/{contactId}", "ChatController@fetchMessages");
    Route::put("/chat/read/{id}", "ChatController@read")->name("chat.read");
    Route::post("/send-message", "ChatController@sendMessage");
    Route::post("/ai-assist", "AISupportController@getAssist");
    Route::post("/ai-prompt", "AISupportController@askAI");
    require base_path("vendor/alexusmai/laravel-file-manager/src/routes.php");
});

/*
|--------------------------------------------------------------------------
| Custom Page Route For UI
|--------------------------------------------------------------------------
*/


// Versione finale e corretta che usa i middleware giusti per TUTTE le rotte del Co-Pilota
Route::middleware(['auth:vendor', 'checkPackage'])->group(function () {

    // La rotta per VISUALIZZARE la pagina
    Route::get('/vendor/ai-support', [App\Http\Controllers\AiCoPilotController::class, 'showPage'])->name('vendor.ai-support');
    // Rotta per la lista clienti
    Route::get('/vendor/my-clients', [App\Http\Controllers\Vendor\ClientiConsulenteController_cde456::class, 'index'])->name('vendor.clients.index');
    Route::get('/consulente/elenco-clienti', [App\Http\Controllers\Vendor\PaginaClientiController::class, 'index'])->name('vendor.clients.elenco');
    Route::get('/vendor/report/{meeting}', [App\Http\Controllers\Vendor\PaginaClientiController::class, 'showReport'])->name('vendor.clients.report');
    Route::get('/consulente/cliente/{user}/storico', [App\Http\Controllers\Vendor\PaginaClientiController::class, 'showClientHistory'])->name('vendor.client.history');
   Route::post('/vendor/report/delete/{report}', [App\Http\Controllers\Vendor\PaginaClientiController::class, 'destroyReport'])->name('vendor.report.destroy');
   Route::post('/vendor/meetings/delete-multiple', [App\Http\Controllers\Vendor\PaginaClientiController::class, 'destroyMultipleMeetings'])->name('vendor.meetings.destroy_multiple');
    
    
    
    // =========== ROTTE PER IL MEETING IN PRESENZA (al livello corretto) ===========
    Route::post('/vendor/meeting/find-client', [App\Http\Controllers\AiCoPilotController::class, 'findClientByVatNumber'])->name('vendor.meeting.findClient');
    Route::post('/vendor/meeting/create-client-on-the-fly', [App\Http\Controllers\AiCoPilotController::class, 'createClientOnTheFly'])->name('vendor.meeting.createClient');
    Route::post('/vendor/meeting/store-record', [App\Http\Controllers\AiCoPilotController::class, 'storeMeetingRecord'])->name('vendor.meeting.store');
    // =================================================================================
 Route::post('/ai-copilot/stream-speech-to-text', [App\Http\Controllers\AiCoPilotController::class, 'streamSpeechToText']);
    // Le rotte API specifiche per il Co-Pilota
    Route::prefix('api/ai-copilot')->group(function () {
        Route::post('/start-session', [App\Http\Controllers\AiCoPilotController::class, 'startSession']);
        Route::post('/end-session', [App\Http\Controllers\AiCoPilotController::class, 'endSession']);
        Route::post('/get-insights', [App\Http\Controllers\AiCoPilotController::class, 'getInsights']);
        Route::post('/generate-tasks', [App\Http\Controllers\AiCoPilotController::class, 'generateTasks']);
        Route::post('/ask-question', [App\Http\Controllers\AiCoPilotController::class, 'askQuestion']);
        Route::post('/get-summary', [App\Http\Controllers\AiCoPilotController::class, 'getSummary']);
       
    });

});
// Rotta generica per le pagine dinamiche.
// Deve venire dopo le rotte specifiche.
Route::get("/{slug}", "FrontEnd\\PageController@page")->name("dynamic_page")->middleware("change.lang");


// fallback route - DEVE ESSERE L'ULTIMA ROTTA IN ASSOLUTO NEL FILE
Route::fallback(function () {
    return view("errors.404");
});