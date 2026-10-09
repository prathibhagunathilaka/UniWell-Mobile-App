// Exact-match translations for shared UI text. The app looks each <Text> string up here; anything
// not listed simply stays in English, so this file can grow screen by screen.
// NOTE: please have a Sinhala / Tamil speaker review these before release.
export type LanguageCode = 'en' | 'si' | 'ta';
type Dictionary = Record<string, string>;

const pairs: [string, string, string][] = [
  // [English, Sinhala, Tamil]
  // Bottom navigation
  ['Home', 'මුල් පිටුව', 'முகப்பு'],
  ['Check-in', 'චෙක්-ඉන්', 'செக்-இன்'],
  ['Counsellors', 'උපදේශකයින්', 'ஆலோசகர்கள்'],
  ['Sessions', 'සැසි', 'அமர்வுகள்'],
  ['Help now', 'දැන්ම උදව්', 'இப்போது உதவி'],
  ['Calendar', 'දින දර්ශනය', 'நாட்காட்டி'],
  ['Availability', 'ලබාගත හැකි වේලාවන්', 'கிடைக்கும் நேரம்'],
  ['Sync', 'සමමුහුර්ත', 'ஒத்திசைவு'],
  ['Resources', 'සම්පත්', 'வளங்கள்'],
  ['Overview', 'සාරාංශය', 'கண்ணோட்டம்'],
  ['Reports', 'වාර්තා', 'அறிக்கைகள்'],

  // Menu + settings
  ['My profile', 'මගේ පැතිකඩ', 'என் சுயவிவரம்'],
  ['Settings', 'සැකසුම්', 'அமைப்புகள்'],
  ['Font size', 'අකුරු ප්‍රමාණය', 'எழுத்து அளவு'],
  ['Small', 'කුඩා', 'சிறியது'],
  ['Default', 'සාමාන්‍ය', 'இயல்பு'],
  ['Large', 'විශාල', 'பெரியது'],
  ['Appearance', 'පෙනුම', 'தோற்றம்'],
  ['Light', 'ලා', 'ஒளி'],
  ['Dark', 'අඳුරු', 'இருண்ட'],
  ['System', 'පද්ධතිය', 'கணினி'],
  ['Push notifications', 'දැනුම්දීම්', 'அறிவிப்புகள்'],
  ['Session reminders', 'සැසි මතක් කිරීම්', 'அமர்வு நினைவூட்டல்கள்'],
  ['Language', 'භාෂාව', 'மொழி'],
  ['Privacy & security', 'රහස්‍යතාව සහ ආරක්ෂාව', 'தனியுரிமை & பாதுகாப்பு'],
  ['Help & support', 'උදව් සහ සහාය', 'உதவி & ஆதரவு'],
  ['About UniWell', 'UniWell ගැන', 'UniWell பற்றி'],
  ['Log out', 'ඉවත් වන්න', 'வெளியேறு'],
  ["Couldn't load your notification settings.", 'ඔබේ දැනුම්දීම් සැකසුම් පූරණය කළ නොහැකි විය.', 'உங்கள் அறிவிப்பு அமைப்புகளை ஏற்ற முடியவில்லை.'],
  ["Couldn't save that change. Please try again.", 'එම වෙනස සුරැකීමට නොහැකි විය. නැවත උත්සාහ කරන්න.', 'அந்த மாற்றத்தைச் சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'],

  // Privacy & security panel
  ['Your privacy', 'ඔබේ රහස්‍යතාව', 'உங்கள் தனியுரிமை'],
  ['Your wellbeing check-ins are private to you unless you choose to share them.', 'ඔබ බෙදා ගැනීමට තෝරා ගන්නේ නැත්නම් ඔබේ යහපැවැත්ම පිළිබඳ චෙක්-ඉන් ඔබට පමණක් පෙනේ.', 'நீங்கள் பகிர விரும்பாவிட்டால், உங்கள் நல செக்-இன்கள் உங்களுக்கு மட்டுமே தெரியும்.'],
  ['Change password', 'මුරපදය වෙනස් කරන්න', 'கடவுச்சொல்லை மாற்று'],
  ["We'll email you a verification code.", 'අපි ඔබට සත්‍යාපන කේතයක් විද්‍යුත් තැපෑලෙන් එවමු.', 'சரிபார்ப்புக் குறியீட்டை மின்னஞ்சலில் அனுப்புவோம்.'],
  ['Sign out of all devices', 'සියලු උපාංගවලින් ඉවත් වන්න', 'அனைத்து சாதனங்களிலிருந்தும் வெளியேறு'],
  ['Ends every active sign-in, including this one.', 'මෙය ඇතුළුව සියලු සක්‍රිය පිවිසුම් අවසන් කරයි.', 'இது உட்பட அனைத்து செயலில் உள்ள உள்நுழைவுகளையும் முடிக்கும்.'],
  ['Manage or delete my account', 'මගේ ගිණුම කළමනාකරණය හෝ මකා දමන්න', 'என் கணக்கை நிர்வகி அல்லது நீக்கு'],
  ['Cancel', 'අවලංගු කරන්න', 'ரத்து செய்'],
  ['Sign out', 'ඉවත් වන්න', 'வெளியேறு'],
  ['Sign out everywhere?', 'සෑම තැනකින්ම ඉවත් වන්නද?', 'எல்லா இடங்களிலும் வெளியேறவா?'],

  // Help & support panel
  ['If you may be in immediate danger', 'ඔබ ක්ෂණික අවදානමක සිටිය හැකි නම්', 'நீங்கள் உடனடி ஆபத்தில் இருக்கலாம் என்றால்'],
  ['Open Help now', 'දැන්ම උදව් විවෘත කරන්න', 'இப்போது உதவியைத் திற'],
  ['Common questions', 'නිතර අසන ප්‍රශ්න', 'பொதுவான கேள்விகள்'],
  ['Contact us', 'අපව සම්බන්ධ කරගන්න', 'எங்களைத் தொடர்பு கொள்ளுங்கள்'],
  ['Call the counselling centre', 'උපදේශන මධ්‍යස්ථානයට අමතන්න', 'ஆலோசனை மையத்தை அழைக்கவும்'],
  ['Visit the counselling website', 'උපදේශන වෙබ් අඩවියට පිවිසෙන්න', 'ஆலோசனை இணையதளத்தைப் பார்வையிடவும்'],
  ['Email support', 'සහාය සඳහා විද්‍යුත් තැපෑල', 'ஆதரவுக்கு மின்னஞ்சல்'],

  // About panel
  ['Version', 'අනුවාදය', 'பதிப்பு'],
  ['UniWell is a university wellbeing app for check-ins, counselling bookings and support.', 'UniWell යනු චෙක්-ඉන්, උපදේශන වෙන්කිරීම් සහ සහාය සඳහා විශ්වවිද්‍යාල යහපැවැත්ම පිළිබඳ යෙදුමකි.', 'UniWell என்பது செக்-இன், ஆலோசனை முன்பதிவு மற்றும் ஆதரவுக்கான பல்கலைக்கழக நல செயலி.'],
  ['UniWell is not an emergency service. If you are in danger, contact your local emergency number.', 'UniWell හදිසි සේවාවක් නොවේ. ඔබ අනතුරක සිටී නම් ඔබේ ප්‍රදේශයේ හදිසි අංකයට අමතන්න.', 'UniWell அவசர சேவை அல்ல. நீங்கள் ஆபத்தில் இருந்தால், உள்ளூர் அவசர எண்ணை அழைக்கவும்.'],

  // Common actions / labels
  ['Try again', 'නැවත උත්සාහ කරන්න', 'மீண்டும் முயற்சிக்கவும்'],
  ['Confirm', 'තහවුරු කරන්න', 'உறுதிப்படுத்து'],
  ['Edit', 'සංස්කරණය', 'திருத்து'],
  ['Remove', 'ඉවත් කරන්න', 'நீக்கு'],
  ['Decline', 'ප්‍රතික්ෂේප කරන්න', 'நிராகரி'],
  ['Delete Account', 'ගිණුම මකන්න', 'கணக்கை நீக்கு'],
  ['Save changes', 'වෙනස්කම් සුරකින්න', 'மாற்றங்களைச் சேமி'],
  ['View all', 'සියල්ල බලන්න', 'அனைத்தையும் பார்'],
  ['View details', 'විස්තර බලන්න', 'விவரங்களைப் பார்'],
  ['Reschedule', 'නැවත සැලසුම් කරන්න', 'மறுநேரம் அமை'],
  ['Learn more', 'තවත් දැනගන්න', 'மேலும் அறிக'],
  ['Back to sign in', 'පිවිසීමට ආපසු', 'உள்நுழைவுக்குத் திரும்பு'],
  ['Account details', 'ගිණුම් විස්තර', 'கணக்கு விவரங்கள்'],
  ['Profile', 'පැතිකඩ', 'சுயவிவரம்'],
  ['Student', 'ශිෂ්‍යයා', 'மாணவர்'],
  ['Students', 'ශිෂ්‍යයින්', 'மாணவர்கள்'],
  ['Status', 'තත්ත්වය', 'நிலை'],
  ['Loading UniWell...', 'UniWell පූරණය වෙමින්...', 'UniWell ஏற்றப்படுகிறது...'],
  ['Support & Safety', 'සහාය සහ ආරක්ෂාව', 'ஆதரவு & பாதுகாப்பு'],
  ['Trusted people', 'විශ්වාසවන්ත පුද්ගලයින්', 'நம்பகமான நபர்கள்'],
  ['All resources', 'සියලු සම්පත්', 'அனைத்து வளங்கள்'],
  ['Filters', 'පෙරහන්', 'வடிகட்டிகள்'],
  ['No matches', 'ගැලපීම් නැත', 'பொருத்தங்கள் இல்லை'],
  ['Session', 'සැසිය', 'அமர்வு'],
  ['Role', 'භූමිකාව', 'பங்கு'],
  ['Bookings', 'වෙන්කිරීම්', 'முன்பதிவுகள்'],
  ['Dashboard', 'උපකරණ පුවරුව', 'முகப்புப் பலகை'],
  ['Today', 'අද', 'இன்று'],
  ['Upcoming', 'ඉදිරියට එන', 'வரவிருக்கும்'],
  ['Completed', 'සම්පූර්ණ කළ', 'முடிந்தது'],
  ['Cancelled', 'අවලංගු කළ', 'ரத்து செய்யப்பட்டது'],

  // Form fields
  ['Email', 'විද්‍යුත් තැපෑල', 'மின்னஞ்சல்'],
  ['Password', 'මුරපදය', 'கடவுச்சொல்'],
  ['Confirm password', 'මුරපදය තහවුරු කරන්න', 'கடவுச்சொல்லை உறுதிப்படுத்தவும்'],
  ['Full name', 'සම්පූර්ණ නම', 'முழு பெயர்'],
  ['Phone number', 'දුරකථන අංකය', 'தொலைபேசி எண்'],
  ['Student ID', 'ශිෂ්‍ය හැඳුනුම් අංකය', 'மாணவர் அடையாள எண்'],
  ['Faculty / School', 'පීඨය / පාසල', 'பீடம் / பள்ளி'],
  ['Year of study', 'අධ්‍යයන වර්ෂය', 'கல்வி ஆண்டு'],
  ['Qualification', 'සුදුසුකම්', 'தகுதி'],
  ['Specialization', 'විශේෂීකරණය', 'நிபுணத்துவம்'],
  ['Years of experience', 'පළපුරුද්ද (වසර)', 'அனுபவம் (ஆண்டுகள்)'],
];

const build = (index: 1 | 2): Dictionary => Object.fromEntries(pairs.map((row) => [row[0], row[index]]));

export const TRANSLATIONS: Record<Exclude<LanguageCode, 'en'>, Dictionary> = {
  si: build(1),
  ta: build(2),
};

export const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'si', label: 'සිංහල' },
  { code: 'ta', label: 'தமிழ்' },
];
