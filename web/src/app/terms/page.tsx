'use client';

export default function TermsPage() {
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
          الشروط والأحكام
        </h1>
        <p className="text-gray-400 mb-12 text-sm">آخر تحديث: أبريل 2026</p>

        <div className="space-y-10 text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. القبول بالشروط</h2>
            <p>
              باستخدامك لتطبيق ALLOUL&Q أو موقعنا الإلكتروني، فإنك توافق على الالتزام بهذه الشروط والأحكام.
              إذا كنت لا توافق على أي من هذه الشروط، يُرجى التوقف عن استخدام الخدمة.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. وصف الخدمة</h2>
            <p className="mb-3">
              ALLOUL&Q هي منصة أعمال ذكية تقدم:
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li>إدارة الفرق والموظفين (Corporate World)</li>
              <li>إدارة المحتوى والإعلام (Media World)</li>
              <li>محاسبة ذكية بالذكاء الاصطناعي (شكرة)</li>
              <li>مكالمات الفيديو والتواصل الداخلي</li>
              <li>مساعد ذكاء اصطناعي للأعمال</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. الحسابات والأمان</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>أنت مسؤول عن الحفاظ على سرية بيانات حسابك</li>
              <li>يجب إخطارنا فوراً عند اشتباهك في أي استخدام غير مصرح</li>
              <li>لا نتحمل مسؤولية أي خسائر ناجمة عن إهمال أمان حسابك</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. الاشتراكات والمدفوعات</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>تُفوتر الاشتراكات شهرياً أو سنوياً حسب الخطة المختارة</li>
              <li>خطة Professional تتضمن 14 يوم تجربة مجانية</li>
              <li>يمكن إلغاء الاشتراك في أي وقت — يستمر الوصول حتى نهاية الفترة المدفوعة</li>
              <li>لا توجد مبالغ مستردة عن الفترات المستخدمة</li>
              <li>تتم معالجة المدفوعات بأمان عبر Stripe</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. الاستخدام المقبول</h2>
            <p className="mb-3">يحظر استخدام المنصة لـ:</p>
            <ul className="space-y-2 list-disc list-inside">
              <li>أي نشاط غير قانوني أو احتيالي</li>
              <li>نشر محتوى مسيء أو ضار أو مضلل</li>
              <li>انتهاك حقوق الملكية الفكرية للآخرين</li>
              <li>محاولة اختراق أو إضرار بالمنصة</li>
              <li>جمع بيانات المستخدمين بدون إذن</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. الملكية الفكرية</h2>
            <p>
              جميع حقوق الملكية الفكرية لمنصة ALLOUL&Q محفوظة. لا يُسمح بنسخ أو توزيع أو تعديل أي جزء
              من المنصة بدون إذن كتابي مسبق منّا.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. حدود المسؤولية</h2>
            <p>
              لا نتحمل المسؤولية عن أي أضرار غير مباشرة أو عرضية أو تبعية ناجمة عن استخدام أو عدم
              القدرة على استخدام الخدمة، بما في ذلك فقدان البيانات أو الأرباح.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. تعليق الخدمة وإنهاؤها</h2>
            <p>
              نحتفظ بالحق في تعليق أو إنهاء حسابك في حال انتهاك هذه الشروط، مع إشعار مسبق
              عند الإمكان.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. تغييرات الخدمة</h2>
            <p>
              قد نُعدّل أو نُوقف بعض ميزات الخدمة في أي وقت. سنُخطرك بأي تغييرات جوهرية قبل
              تطبيقها بـ 30 يوماً على الأقل.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">10. القانون المطبّق</h2>
            <p>
              تخضع هذه الشروط لقوانين المملكة العربية السعودية. أي نزاع يُحلّ عبر التحكيم أو
              المحاكم المختصة في المملكة العربية السعودية.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">11. تواصل معنا</h2>
            <p>لأي استفسار حول هذه الشروط:</p>
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
            <a href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">سياسة الخصوصية</a>
            <a href="/terms" className="text-blue-400 text-sm">الشروط والأحكام</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
