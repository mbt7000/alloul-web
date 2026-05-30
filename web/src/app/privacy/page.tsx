'use client';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white" dir="rtl">
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-2xl font-bold bg-gradient-to-l from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            ALLOUL&Q
          </a>
          <a href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
            العودة للرئيسية
          </a>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-l from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          سياسة الخصوصية
        </h1>
        <p className="text-gray-400 mb-12 text-sm">آخر تحديث: أبريل 2026</p>

        <div className="space-y-10 text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. المقدمة</h2>
            <p>
              مرحباً بك في ALLOUL&Q ("نحن"، "منصتنا"). نحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية.
              تصف هذه السياسة كيفية جمع بياناتك واستخدامها وحمايتها عند استخدام تطبيق ALLOUL&Q وموقعنا الإلكتروني.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. البيانات التي نجمعها</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li><span className="text-white font-medium">بيانات الحساب:</span> الاسم، البريد الإلكتروني، اسم المستخدم، كلمة المرور المشفّرة</li>
              <li><span className="text-white font-medium">بيانات الشركة:</span> اسم الشركة، عدد الموظفين، نوع الأعمال</li>
              <li><span className="text-white font-medium">بيانات الاستخدام:</span> سجلات الدخول، الميزات المستخدمة، الأجهزة المتصلة</li>
              <li><span className="text-white font-medium">البيانات المالية:</span> سجلات المحاسبة التي تدخلها عبر خدمة شكرة</li>
              <li><span className="text-white font-medium">الإشعارات:</span> رمز Expo Push Token لإرسال الإشعارات</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. كيف نستخدم بياناتك</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>تشغيل الخدمات وتوفير الميزات المشتركة بها</li>
              <li>إرسال إشعارات مهمة تتعلق بحسابك</li>
              <li>تحسين أداء المنصة وتطويرها</li>
              <li>معالجة المدفوعات عبر Stripe</li>
              <li>الرد على طلبات الدعم الفني</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. مشاركة البيانات مع أطراف ثالثة</h2>
            <p className="mb-3">نشارك بياناتك فقط مع الشركاء الضروريين لتشغيل الخدمة:</p>
            <ul className="space-y-2 list-disc list-inside">
              <li><span className="text-white font-medium">Stripe:</span> معالجة المدفوعات</li>
              <li><span className="text-white font-medium">Firebase (Google):</span> المصادقة وتسجيل الدخول</li>
              <li><span className="text-white font-medium">Microsoft Azure:</span> تخزين الملفات والصور</li>
              <li><span className="text-white font-medium">Daily.co:</span> مكالمات الفيديو</li>
              <li><span className="text-white font-medium">Anthropic:</span> معالجة طلبات الذكاء الاصطناعي</li>
            </ul>
            <p className="mt-3">لا نبيع بياناتك لأي طرف ثالث.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. أمان البيانات</h2>
            <p>
              نستخدم تشفير SSL/TLS لجميع الاتصالات. كلمات المرور مشفّرة باستخدام bcrypt.
              يتم تخزين البيانات على خوادم آمنة مع تطبيق مبدأ أقل الصلاحيات.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. حقوقك</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>الوصول إلى بياناتك الشخصية وتصديرها</li>
              <li>تعديل أو تصحيح بياناتك في أي وقت</li>
              <li>حذف حسابك وجميع بياناتك</li>
              <li>الاعتراض على معالجة بياناتك</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. الاحتفاظ بالبيانات</h2>
            <p>
              نحتفظ ببياناتك طالما حسابك نشط. عند حذف الحساب، تُحذف جميع البيانات خلال 30 يوماً.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. خصوصية الأطفال</h2>
            <p>
              خدماتنا موجهة للشركات والأفراد البالغين (18 سنة فأكثر). لا نجمع بيانات الأطفال عن قصد.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. التغييرات على هذه السياسة</h2>
            <p>
              قد نحدّث هذه السياسة من وقت لآخر. سنُخطرك بأي تغييرات جوهرية عبر البريد الإلكتروني أو إشعار داخل التطبيق.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">10. تواصل معنا</h2>
            <p>لأي استفسار حول الخصوصية:</p>
            <div className="mt-3 space-y-1">
              <p>📧 <a href="mailto:support@alloul.app" className="text-blue-400 hover:underline">support@alloul.app</a></p>
              <p>🌐 <a href="https://alloul.app" className="text-blue-400 hover:underline">alloul.app</a></p>
            </div>
          </section>

        </div>
      </main>

      <footer className="border-t border-slate-800 py-8 px-4 mt-16">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-sm">© 2026 ALLOUL&Q. جميع الحقوق محفوظة</p>
          <div className="flex gap-6">
            <a href="/privacy" className="text-blue-400 text-sm">سياسة الخصوصية</a>
            <a href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">الشروط والأحكام</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
