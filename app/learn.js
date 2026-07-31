/* ============ DZEN · Энергия v11 — сбор обратной связи ============
   Зачем: чтобы со временем чат отвечал лучше. Копим ОБЕЗЛИЧЕННУЮ статистику:
   о чём спрашивали и помог ли ответ. По этим данным правится база знаний.

   ЧТО СОБИРАЕМ: текст вопроса (почищенный), тема, оценка ответа (палец вверх/вниз),
   чем закончился разговор, первые 120 знаков ответа банки — чтобы понять, что чинить.
   ЧТО НЕ СОБИРАЕМ: имена, id, телефоны, почты, ники, ссылки, длинные числа —
   всё это вырезается функцией scrub() ДО записи. Никаких cookie и меток человека.

   ГДЕ ЛЕЖИТ: localStorage устройства. Уходит только в приватный Telegram-канал
   владельца (бот-приёмник), если он настроен в window.DZEN_LOG.
   Пока не настроен — данные просто копятся локально и никуда не уходят.

   Отключить на устройстве: dzenLearnOff()   Посмотреть: dzenLearnPeek() */
'use strict';

var LK='zen.talk11.learn';

function lnLoad(){try{var s=JSON.parse(localStorage.getItem(LK));if(s&&s.v===1)return s;}catch(e){}
  return {v:1,off:false,q:[],sent:null,sid:Math.random().toString(36).slice(2,7)};}
function lnSave(s){try{localStorage.setItem(LK,JSON.stringify(s));}catch(e){}}
var LN=lnLoad();

/* вырезаем всё, по чему можно узнать человека */
function scrub(t){
  return String(t||'')
    .replace(/https?:\/\/\S+/gi,'[ссылка]')
    .replace(/[\w.+-]+@[\w.-]+\.\w+/g,'[почта]')
    .replace(/@[A-Za-z0-9_]{3,}/g,'[ник]')
    .replace(/(\+?\d[\d\s()().-]{8,}\d)/g,'[телефон]')
    .replace(/\b\d{4,}\b/g,'[число]')
    /* представления по имени: «меня зовут X», «я X», «это X» */
    .replace(/(меня\s+зовут|зовут\s+меня|моё\s+имя|мое\s+имя|я\s*[-—]\s*|это\s+)\s*[А-ЯЁA-Z][а-яёa-z]+(\s+[А-ЯЁA-Z][а-яёa-z]+)?/g,'$1[имя]')
    /* любое слово с большой буквы не в начале фразы — вероятное имя/город.
       Идём посимвольно по всем словам (а не regex с общим хвостом), иначе
       во «Жена Марина» второе слово подряд не проверялось. */
    .split(/(\s+)/).map(function(w,i,arr){
      if(!/^[А-ЯЁ][а-яё]{2,}[.,!?;:]?$/.test(w))return w;
      var prev=arr.slice(0,i).join('');
      if(!prev.trim())return w;                       /* самое начало фразы — оставляем */
      if(/[.!?…]\s*$/.test(prev))return w;            /* начало нового предложения */
      var bare=w.replace(/[.,!?;:]$/,''),tail=w.slice(bare.length);
      var ok=/^(Я|Мне|Меня|Кофе|Сон|Утро|Вечер|Ночь|Днём|Днем|Спорт|Сахар|Телефон|Работа|Энергия|Дзен|Додо|Если|Как|Что|Почему|Когда|Где|Не|Да|Нет|Просто|Очень|Иногда|Всегда|Никогда|Сегодня|Вчера|Завтра|Жена|Муж|Мама|Папа|Дочь|Сын|Врач|Доктор)$/.test(bare);
      return ok?w:'[имя]'+tail;}).join('')
    .replace(/\s+/g,' ').trim().slice(0,180);}

/* грубая тема вопроса — чтобы видеть, о чём спрашивают чаще всего */
function topic(t){
  t=(t||'').toLowerCase().replace(/ё/g,'е');
  var M=[['сон',/сон|спать|спл|высып|уснуть|засып|бессонн|ноч|храп|отсып|отосп|выходн|режим|ложус|лечь|отбой/],
         ['утро/свет',/утр|свет|подъем|просыпа|встаю|будильник/],
         ['день/провал',/провал|днем|обед|вырубает|сонлив|устал|нет сил|разбит/],
         ['кофе',/кофе|кофеин|энергетик|чай/],
         ['еда/сахар',/сахар|сладк|еда|завтрак|перекус|тянет|аппетит|вес|похуд/],
         ['спорт',/спорт|зал|трениров|бег|ходьб|прогулк|движен/],
         ['стресс',/стресс|нерв|тревог|напряж|выгоран|работ/],
         ['алкоголь',/алког|вино|пиво|выпил/],
         ['экраны',/телефон|экран|лент|соцсет|скролл|залипа/],
         ['привычки',/привычк|сорвал|срыв|сила воли|мотивац|сери|стрик/],
         ['здоровье/врач',/врач|апно|таблет|бад|мелатонин|диагноз|боль|давлен/],
         ['продукт',/dzen|дзен|банк|газиров|додо|пребиотик|купить|цена/],
         ['болтовня',/анекдот|шутк|привет|как дела|ты кто|робот|погод/]];
  for(var i=0;i<M.length;i++)if(M[i][1].test(t))return M[i][0];
  return 'другое';}

/* обмен репликами: вопрос + начало ответа банки */
window.lnAsk=function(q,a){
  if(LN.off)return;
  LN.q.push({t:Date.now(),q:scrub(q),tp:topic(q),a:scrub(a).slice(0,120),r:null});
  if(LN.q.length>80)LN.q=LN.q.slice(-80);
  lnSave(LN);};

/* оценка последнего неоценённого ответа: true = помог */
window.lnRate=function(good){
  if(LN.off)return;
  for(var i=LN.q.length-1;i>=0;i--){if(LN.q[i].q&&LN.q[i].r===null){LN.q[i].r=good?1:0;break;}}
  lnSave(LN);};

/* события: чем закончился разговор, где отвалились */
window.lnEvent=function(name){
  if(LN.off)return;
  LN.q.push({t:Date.now(),e:String(name).slice(0,28)});
  if(LN.q.length>80)LN.q=LN.q.slice(-80);
  lnSave(LN);};

window.dzenLearnOff=function(){LN={v:1,off:true,q:[],sent:null,sid:''};lnSave(LN);
  return 'Сбор отключён на этом устройстве, накопленное стёрто.';};
window.dzenLearnOn=function(){LN.off=false;lnSave(LN);return 'Сбор включён.';};
window.dzenLearnPeek=function(){return JSON.parse(JSON.stringify(LN));};

/* ---- отправка владельцу (только если настроен приёмник) ----
   window.DZEN_LOG = {bot:'<токен бота-приёмника>', chat:'<id чата владельца>'}
   Токен отдельного бота, который умеет только писать владельцу: в худшем случае
   утечки злоумышленник сможет писать сообщения от имени этого бота — и всё.
   Ни GitHub, ни данные людей, ни основной бот напоминаний не затрагиваются. */
function lnFlush(force){
  if(LN.off||!LN.q.length)return;
  var L=window.DZEN_LOG;
  if(!L||!L.bot||!L.chat)return;                      /* приёмник не настроен — просто копим */
  var today=(new Date()).toISOString().slice(0,10);
  if(!force&&LN.sent===today)return;
  var items=LN.q.slice(-30);
  var lines=['📊 DZEN чат · '+today+' · сессия '+(LN.sid||'—')];
  items.forEach(function(it){
    if(it.e){lines.push('• событие: '+it.e);return;}
    var mark=it.r===1?'👍':it.r===0?'👎':'—';
    lines.push('• ['+it.tp+'] '+mark+' В: '+it.q+'\n   О: '+it.a);});
  var text=lines.join('\n').slice(0,3900);
  fetch('https://api.telegram.org/bot'+L.bot+'/sendMessage',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({chat_id:L.chat,text:text,disable_web_page_preview:true})})
   .then(function(r){if(r.ok){LN.sent=today;LN.q=[];lnSave(LN);}})
   .catch(function(){});}

window.dzenLearnSend=function(){lnFlush(true);return 'Отправляю…';};
window.addEventListener('pagehide',function(){lnFlush(false);});
setTimeout(function(){lnFlush(false);},5000);
