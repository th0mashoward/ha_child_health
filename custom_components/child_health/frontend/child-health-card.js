var W=globalThis,B=W.ShadowRoot&&(W.ShadyCSS===void 0||W.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,et=Symbol(),At=new WeakMap,I=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==et)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o,e=this.t;if(B&&t===void 0){let s=e!==void 0&&e.length===1;s&&(t=At.get(e)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&At.set(e,t))}return t}toString(){return this.cssText}},St=r=>new I(typeof r=="string"?r:r+"",void 0,et),st=(r,...t)=>{let e=r.length===1?r[0]:t.reduce((s,i,n)=>s+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+r[n+1],r[0]);return new I(e,r,et)},Et=(r,t)=>{if(B)r.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let e of t){let s=document.createElement("style"),i=W.litNonce;i!==void 0&&s.setAttribute("nonce",i),s.textContent=e.cssText,r.appendChild(s)}},it=B?r=>r:r=>r instanceof CSSStyleSheet?(t=>{let e="";for(let s of t.cssRules)e+=s.cssText;return St(e)})(r):r;var{is:Xt,defineProperty:te,getOwnPropertyDescriptor:ee,getOwnPropertyNames:se,getOwnPropertySymbols:ie,getPrototypeOf:re}=Object,K=globalThis,Ct=K.trustedTypes,ne=Ct?Ct.emptyScript:"",oe=K.reactiveElementPolyfillSupport,H=(r,t)=>r,rt={toAttribute(r,t){switch(t){case Boolean:r=r?ne:null;break;case Object:case Array:r=r==null?r:JSON.stringify(r)}return r},fromAttribute(r,t){let e=r;switch(t){case Boolean:e=r!==null;break;case Number:e=r===null?null:Number(r);break;case Object:case Array:try{e=JSON.parse(r)}catch{e=null}}return e}},kt=(r,t)=>!Xt(r,t),Tt={attribute:!0,type:String,converter:rt,reflect:!1,useDefault:!1,hasChanged:kt};Symbol.metadata??=Symbol("metadata"),K.litPropertyMetadata??=new WeakMap;var v=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=Tt){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){let s=Symbol(),i=this.getPropertyDescriptor(t,s,e);i!==void 0&&te(this.prototype,t,i)}}static getPropertyDescriptor(t,e,s){let{get:i,set:n}=ee(this.prototype,t)??{get(){return this[e]},set(o){this[e]=o}};return{get:i,set(o){let a=i?.call(this);n?.call(this,o),this.requestUpdate(t,a,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??Tt}static _$Ei(){if(this.hasOwnProperty(H("elementProperties")))return;let t=re(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(H("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(H("properties"))){let e=this.properties,s=[...se(e),...ie(e)];for(let i of s)this.createProperty(i,e[i])}let t=this[Symbol.metadata];if(t!==null){let e=litPropertyMetadata.get(t);if(e!==void 0)for(let[s,i]of e)this.elementProperties.set(s,i)}this._$Eh=new Map;for(let[e,s]of this.elementProperties){let i=this._$Eu(e,s);i!==void 0&&this._$Eh.set(i,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){let e=[];if(Array.isArray(t)){let s=new Set(t.flat(1/0).reverse());for(let i of s)e.unshift(it(i))}else t!==void 0&&e.push(it(t));return e}static _$Eu(t,e){let s=e.attribute;return s===!1?void 0:typeof s=="string"?s:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),this.renderRoot!==void 0&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){let t=new Map,e=this.constructor.elementProperties;for(let s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){let t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Et(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){let s=this.constructor.elementProperties.get(t),i=this.constructor._$Eu(t,s);if(i!==void 0&&s.reflect===!0){let n=(s.converter?.toAttribute!==void 0?s.converter:rt).toAttribute(e,s.type);this._$Em=t,n==null?this.removeAttribute(i):this.setAttribute(i,n),this._$Em=null}}_$AK(t,e){let s=this.constructor,i=s._$Eh.get(t);if(i!==void 0&&this._$Em!==i){let n=s.getPropertyOptions(i),o=typeof n.converter=="function"?{fromAttribute:n.converter}:n.converter?.fromAttribute!==void 0?n.converter:rt;this._$Em=i;let a=o.fromAttribute(e,n.type);this[i]=a??this._$Ej?.get(i)??a,this._$Em=null}}requestUpdate(t,e,s,i=!1,n){if(t!==void 0){let o=this.constructor;if(i===!1&&(n=this[t]),s??=o.getPropertyOptions(t),!((s.hasChanged??kt)(n,e)||s.useDefault&&s.reflect&&n===this._$Ej?.get(t)&&!this.hasAttribute(o._$Eu(t,s))))return;this.C(t,e,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:i,wrapped:n},o){s&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,o??e??this[t]),n!==!0||o!==void 0)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),i===!0&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[i,n]of this._$Ep)this[i]=n;this._$Ep=void 0}let s=this.constructor.elementProperties;if(s.size>0)for(let[i,n]of s){let{wrapped:o}=n,a=this[i];o!==!0||this._$AL.has(i)||a===void 0||this.C(i,void 0,n,a)}}let t=!1,e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(s=>s.hostUpdate?.()),this.update(e)):this._$EM()}catch(s){throw t=!1,this._$EM(),s}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(t){}firstUpdated(t){}};v.elementStyles=[],v.shadowRootOptions={mode:"open"},v[H("elementProperties")]=new Map,v[H("finalized")]=new Map,oe?.({ReactiveElement:v}),(K.reactiveElementVersions??=[]).push("2.1.2");var dt=globalThis,Dt=r=>r,Y=dt.trustedTypes,Mt=Y?Y.createPolicy("lit-html",{createHTML:r=>r}):void 0,Ut="$lit$",y=`lit$${Math.random().toFixed(9).slice(2)}$`,Ot="?"+y,ae=`<${Ot}>`,w=document,N=()=>w.createComment(""),R=r=>r===null||typeof r!="object"&&typeof r!="function",ut=Array.isArray,le=r=>ut(r)||typeof r?.[Symbol.iterator]=="function",nt=`[ 	
\f\r]`,P=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,It=/-->/g,Ht=/>/g,b=RegExp(`>|${nt}(?:([^\\s"'>=/]+)(${nt}*=${nt}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),Pt=/'/g,Nt=/"/g,Lt=/^(?:script|style|textarea|title)$/i,pt=r=>(t,...e)=>({_$litType$:r,strings:t,values:e}),c=pt(1),L=pt(2),be=pt(3),A=Symbol.for("lit-noChange"),d=Symbol.for("lit-nothing"),Rt=new WeakMap,x=w.createTreeWalker(w,129);function zt(r,t){if(!ut(r)||!r.hasOwnProperty("raw"))throw Error("invalid template strings array");return Mt!==void 0?Mt.createHTML(t):t}var ce=(r,t)=>{let e=r.length-1,s=[],i,n=t===2?"<svg>":t===3?"<math>":"",o=P;for(let a=0;a<e;a++){let l=r[a],u,m,p=-1,f=0;for(;f<l.length&&(o.lastIndex=f,m=o.exec(l),m!==null);)f=o.lastIndex,o===P?m[1]==="!--"?o=It:m[1]!==void 0?o=Ht:m[2]!==void 0?(Lt.test(m[2])&&(i=RegExp("</"+m[2],"g")),o=b):m[3]!==void 0&&(o=b):o===b?m[0]===">"?(o=i??P,p=-1):m[1]===void 0?p=-2:(p=o.lastIndex-m[2].length,u=m[1],o=m[3]===void 0?b:m[3]==='"'?Nt:Pt):o===Nt||o===Pt?o=b:o===It||o===Ht?o=P:(o=b,i=void 0);let _=o===b&&r[a+1].startsWith("/>")?" ":"";n+=o===P?l+ae:p>=0?(s.push(u),l.slice(0,p)+Ut+l.slice(p)+y+_):l+y+(p===-2?a:_)}return[zt(r,n+(r[e]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),s]},U=class r{constructor({strings:t,_$litType$:e},s){let i;this.parts=[];let n=0,o=0,a=t.length-1,l=this.parts,[u,m]=ce(t,e);if(this.el=r.createElement(u,s),x.currentNode=this.el.content,e===2||e===3){let p=this.el.content.firstChild;p.replaceWith(...p.childNodes)}for(;(i=x.nextNode())!==null&&l.length<a;){if(i.nodeType===1){if(i.hasAttributes())for(let p of i.getAttributeNames())if(p.endsWith(Ut)){let f=m[o++],_=i.getAttribute(p).split(y),E=/([.?@])?(.*)/.exec(f);l.push({type:1,index:n,name:E[2],strings:_,ctor:E[1]==="."?at:E[1]==="?"?lt:E[1]==="@"?ct:T}),i.removeAttribute(p)}else p.startsWith(y)&&(l.push({type:6,index:n}),i.removeAttribute(p));if(Lt.test(i.tagName)){let p=i.textContent.split(y),f=p.length-1;if(f>0){i.textContent=Y?Y.emptyScript:"";for(let _=0;_<f;_++)i.append(p[_],N()),x.nextNode(),l.push({type:2,index:++n});i.append(p[f],N())}}}else if(i.nodeType===8)if(i.data===Ot)l.push({type:2,index:n});else{let p=-1;for(;(p=i.data.indexOf(y,p+1))!==-1;)l.push({type:7,index:n}),p+=y.length-1}n++}}static createElement(t,e){let s=w.createElement("template");return s.innerHTML=t,s}};function C(r,t,e=r,s){if(t===A)return t;let i=s!==void 0?e._$Co?.[s]:e._$Cl,n=R(t)?void 0:t._$litDirective$;return i?.constructor!==n&&(i?._$AO?.(!1),n===void 0?i=void 0:(i=new n(r),i._$AT(r,e,s)),s!==void 0?(e._$Co??=[])[s]=i:e._$Cl=i),i!==void 0&&(t=C(r,i._$AS(r,t.values),i,s)),t}var ot=class{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){let{el:{content:e},parts:s}=this._$AD,i=(t?.creationScope??w).importNode(e,!0);x.currentNode=i;let n=x.nextNode(),o=0,a=0,l=s[0];for(;l!==void 0;){if(o===l.index){let u;l.type===2?u=new O(n,n.nextSibling,this,t):l.type===1?u=new l.ctor(n,l.name,l.strings,this,t):l.type===6&&(u=new ht(n,this,t)),this._$AV.push(u),l=s[++a]}o!==l?.index&&(n=x.nextNode(),o++)}return x.currentNode=w,i}p(t){let e=0;for(let s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}},O=class r{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,s,i){this.type=2,this._$AH=d,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode,e=this._$AM;return e!==void 0&&t?.nodeType===11&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=C(this,t,e),R(t)?t===d||t==null||t===""?(this._$AH!==d&&this._$AR(),this._$AH=d):t!==this._$AH&&t!==A&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):le(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==d&&R(this._$AH)?this._$AA.nextSibling.data=t:this.T(w.createTextNode(t)),this._$AH=t}$(t){let{values:e,_$litType$:s}=t,i=typeof s=="number"?this._$AC(t):(s.el===void 0&&(s.el=U.createElement(zt(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===i)this._$AH.p(e);else{let n=new ot(i,this),o=n.u(this.options);n.p(e),this.T(o),this._$AH=n}}_$AC(t){let e=Rt.get(t.strings);return e===void 0&&Rt.set(t.strings,e=new U(t)),e}k(t){ut(this._$AH)||(this._$AH=[],this._$AR());let e=this._$AH,s,i=0;for(let n of t)i===e.length?e.push(s=new r(this.O(N()),this.O(N()),this,this.options)):s=e[i],s._$AI(n),i++;i<e.length&&(this._$AR(s&&s._$AB.nextSibling,i),e.length=i)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){let s=Dt(t).nextSibling;Dt(t).remove(),t=s}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}},T=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,i,n){this.type=1,this._$AH=d,this._$AN=void 0,this.element=t,this.name=e,this._$AM=i,this.options=n,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=d}_$AI(t,e=this,s,i){let n=this.strings,o=!1;if(n===void 0)t=C(this,t,e,0),o=!R(t)||t!==this._$AH&&t!==A,o&&(this._$AH=t);else{let a=t,l,u;for(t=n[0],l=0;l<n.length-1;l++)u=C(this,a[s+l],e,l),u===A&&(u=this._$AH[l]),o||=!R(u)||u!==this._$AH[l],u===d?t=d:t!==d&&(t+=(u??"")+n[l+1]),this._$AH[l]=u}o&&!i&&this.j(t)}j(t){t===d?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}},at=class extends T{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===d?void 0:t}},lt=class extends T{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==d)}},ct=class extends T{constructor(t,e,s,i,n){super(t,e,s,i,n),this.type=5}_$AI(t,e=this){if((t=C(this,t,e,0)??d)===A)return;let s=this._$AH,i=t===d&&s!==d||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,n=t!==d&&(s===d||i);i&&this.element.removeEventListener(this.name,this,s),n&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}},ht=class{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){C(this,t)}};var he=dt.litHtmlPolyfillSupport;he?.(U,O),(dt.litHtmlVersions??=[]).push("3.3.3");var jt=(r,t,e)=>{let s=e?.renderBefore??t,i=s._$litPart$;if(i===void 0){let n=e?.renderBefore??null;s._$litPart$=i=new O(t.insertBefore(N(),n),n,void 0,e??{})}return i._$AI(r),i};var mt=globalThis,g=class extends v{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){let e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=jt(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return A}};g._$litElement$=!0,g.finalized=!0,mt.litElementHydrateSupport?.({LitElement:g});var de=mt.litElementPolyfillSupport;de?.({LitElement:g});(mt.litElementVersions??=[]).push("4.2.2");function j(r){let t=Math.max(0,Math.round(r/6e4));if(t<1)return"<1m";if(t<60)return`${t}m`;let e=Math.floor(t/60),s=t%60;if(e<48)return s?`${e}h ${s}m`:`${e}h`;let i=Math.floor(e/24),n=e%24;return n?`${i}d ${n}h`:`${i}d`}function J(r){return r<6e4?"just now":`${j(r)} ago`}function V(r,t,e){let s=new Date(r),i=s.toLocaleTimeString(e,{hour:"2-digit",minute:"2-digit"}),n=new Date(t);return s.getFullYear()===n.getFullYear()&&s.getMonth()===n.getMonth()&&s.getDate()===n.getDate()?i:`${s.toLocaleDateString(e,{weekday:"short"})} ${i}`}function Vt(r){let t=r.replace(",",".").match(/[0-9]+(?:\.[0-9]+)?/);if(!t)return null;let e=parseFloat(t[0]);return e>0?e:null}function Ft(r){if(!r)return;let t=new Date(r);return Number.isNaN(t.getTime())?void 0:t.toISOString()}function ft(r){return new Date(r-new Date(r).getTimezoneOffset()*6e4).toISOString().slice(0,16)}function z(r){if(!r||r.state==="unknown"||r.state==="unavailable")return null;let t=new Date(r.state);return Number.isNaN(t.getTime())?null:t}function S(r,t){return t?r.states[t]:void 0}function Wt(r,t,e){let s=z(S(t,r.last)),i=z(S(t,r.clear_at));if(!s||!i)return{last:s,clearAt:i,clear:!0,progress:1};let n=e>=i.getTime(),o=i.getTime()-s.getTime(),a=n||o<=0?1:Math.min(1,Math.max(0,(e-s.getTime())/o));return{last:s,clearAt:i,clear:n,progress:a}}function _t(r,t,e){let s=z(S(t,r.last)),i=z(S(t,r.next));return{last:s,next:i,allowed:!i||e>=i.getTime()}}function Bt(r,t){let e=S(t,r.entities.last_temperature);if(!e||e.state==="unknown"||e.state==="unavailable")return null;let s=parseFloat(e.state);if(Number.isNaN(s))return null;let i=e.attributes.recorded_at,n=typeof i=="string"?new Date(i):null;return{value:s,recordedAt:n,fever:s>=r.fever_threshold}}function Kt(r,t){return z(S(t,r.entities.recheck_at))}function gt(r,t){let e=S(t,r.entities.ill);if(!e||e.state!=="on")return{ill:!1,illness:null,since:null};let s=e.attributes.illness,i=e.attributes.since;return{ill:!0,illness:typeof s=="string"&&s?s:null,since:typeof i=="string"?new Date(i):null}}function vt(r,t){return t.filter(e=>!!e).map(e=>{let s=r.states[e];return s?`${e}|${s.state}|${s.last_updated}`:`${e}|missing`}).join(";")}function $t(r){return[...Object.values(r.entities),...r.symptoms.flatMap(t=>[t.last,t.clear_at,t.clear]),...r.medicines.flatMap(t=>[t.last,t.next,t.allowed])]}var D={left:34,right:10,top:10,bottom:22},k=D;function Yt(r,t,e,s,i=320,n=140,o){let a=e-s*864e5,l=i-k.left-k.right,u=n-k.top-k.bottom,m=r.map(h=>({at:Date.parse(h.at),value:h.value})).filter(h=>!Number.isNaN(h.at)&&h.at>=a&&h.at<=e+6e4).sort((h,$)=>h.at-$.at),p={width:i,height:n,yTicks:[],xTicks:[],thresholdY:0};if(m.length===0)return{...p,empty:!0,points:[],path:""};let f=t>60,_=Math.min(t-(f?2.7:1.5),...m.map(h=>h.value))-.3,E=Math.max(t+(f?1.8:1),...m.map(h=>h.value))+.3,M=Math.floor(_*2)/2,F=Math.ceil(E*2)/2,yt=h=>k.left+Math.min(1,Math.max(0,(h-a)/(e-a)))*l,Q=h=>k.top+(1-(h-M)/(F-M))*u,X=m.map(h=>({x:yt(h.at),y:Q(h.value),value:h.value,at:h.at,fever:h.value>=t})),Qt=X.length>1?X.map((h,$)=>`${$?"L":"M"}${h.x.toFixed(1)} ${h.y.toFixed(1)}`).join(" "):"",tt=F-M<=3?.5:F-M<=8?1:2,bt=[];for(let h=Math.ceil(M/tt)*tt;h<=F+1e-9;h+=tt)bt.push({y:Q(h),label:Number.isInteger(h)?String(h):h.toFixed(1)});let xt=[],wt=new Date(a);wt.setHours(24,0,0,0);for(let h=wt.getTime();h<e;){xt.push({x:yt(h),label:new Date(h).toLocaleDateString(o,s<=7?{weekday:"short"}:{day:"numeric",month:"short"})});let $=new Date(h);$.setDate($.getDate()+(s>7?Math.ceil(s/7):1)),$.setHours(0,0,0,0),h=$.getTime()}return{...p,empty:!1,points:X,path:Qt,thresholdY:Q(t),yTicks:bt,xTicks:xt}}function q(r){return r.filter(t=>!!t).join(" \xB7 ")}function qt(r,t){let e=[];for(let s of r.symptoms)e.push({id:s.id,kind:"symptom",at:Date.parse(s.at),title:s.name,detail:q([s.note]),fever:!1,icon:"mdi:emoticon-sick-outline"});for(let s of r.temperatures)e.push({id:s.id,kind:"temperature",at:Date.parse(s.at),title:`${s.value}${t.unit_symbol}`,detail:q([s.note]),fever:s.value>=t.fever_threshold,icon:"mdi:thermometer"});for(let s of r.doses)e.push({id:s.id,kind:"dose",at:Date.parse(s.at),title:`${s.name} given`,detail:q([s.given_by?`by ${s.given_by}`:null,s.note]),fever:!1,icon:"mdi:pill"});for(let s of r.episodes)e.push({id:s.id,kind:"episode",at:Date.parse(s.start),title:`Illness${s.illness?`: ${s.illness}`:""}`,detail:q([s.end?"ended":"ongoing",s.notes]),fever:!1,icon:"mdi:medical-bag"});return e.filter(s=>!Number.isNaN(s.at)).sort((s,i)=>i.at-s.at)}var Jt=st`
  :host {
    display: block;
  }
  ha-card {
    padding-bottom: 12px;
    overflow: hidden;
  }
  .header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    padding: 16px 16px 4px;
  }
  .name {
    font-size: 1.25rem;
    font-weight: 500;
    color: var(--primary-text-color);
    margin-right: auto;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px 3px 6px;
    border-radius: 999px;
    font-size: 0.8rem;
    background: var(--secondary-background-color);
    color: var(--primary-text-color);
    --mdc-icon-size: 16px;
  }
  .chip.ok {
    color: var(--success-color, #2e7d32);
  }
  .chip.warn,
  .chip.bad {
    color: var(--error-color, #c62828);
    font-weight: 500;
  }
  .chip.info {
    color: var(--primary-color);
  }
  .empty {
    padding: 24px 16px;
    color: var(--secondary-text-color);
  }
  .error {
    margin: 8px 16px 0;
    padding: 8px 12px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--error-color, #c62828) 14%, transparent);
    color: var(--error-color, #c62828);
    font-size: 0.9rem;
  }
  .status {
    padding: 4px 16px 0;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid var(--divider-color);
    --mdc-icon-size: 22px;
    color: var(--secondary-text-color);
  }
  .row:last-child {
    border-bottom: none;
  }
  .grow {
    flex: 1;
    min-width: 0;
  }
  .label {
    color: var(--primary-text-color);
    font-weight: 500;
  }
  .sub {
    font-size: 0.8rem;
    color: var(--secondary-text-color);
  }
  .value {
    font-size: 0.9rem;
    text-align: right;
    white-space: nowrap;
  }
  .value.ok {
    color: var(--success-color, #2e7d32);
  }
  .value.warn {
    color: var(--warning-color, #ef6c00);
    font-weight: 500;
  }
  .value.muted {
    color: var(--secondary-text-color);
  }
  .bar {
    height: 4px;
    margin-top: 6px;
    border-radius: 2px;
    background: var(--divider-color);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--warning-color, #ef6c00);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px 16px 4px;
  }
  button {
    font: inherit;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .act {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border: 1px solid var(--divider-color);
    border-radius: 999px;
    background: var(--card-background-color);
    color: var(--primary-text-color);
    --mdc-icon-size: 18px;
  }
  .act:hover:not(:disabled) {
    border-color: var(--primary-color);
  }
  .act.caution {
    border-style: dashed;
    color: var(--secondary-text-color);
  }
  .act.on {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
  .panel {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 8px 16px 0;
    padding: 10px 12px;
    border-radius: 12px;
    background: var(--secondary-background-color);
  }
  .panel.caution {
    background: color-mix(in srgb, var(--warning-color, #ef6c00) 14%, transparent);
  }
  .panel .msg {
    flex: 1 1 100%;
    font-size: 0.9rem;
    color: var(--primary-text-color);
  }
  .hint {
    font-size: 0.8rem;
    color: var(--secondary-text-color);
  }
  input {
    font: inherit;
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid var(--divider-color);
    background: var(--card-background-color);
    color: var(--primary-text-color);
    min-width: 0;
  }
  input.temp {
    width: 7em;
  }
  .primary,
  .ghost,
  .danger {
    padding: 6px 14px;
    border-radius: 8px;
    border: 1px solid transparent;
  }
  .primary {
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
  }
  .danger {
    background: var(--error-color, #c62828);
    color: #fff;
  }
  .ghost {
    background: transparent;
    border-color: var(--divider-color);
    color: var(--primary-text-color);
  }
  .section {
    padding: 14px 16px 0;
  }
  .section-title {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--secondary-text-color);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 6px;
  }
  .muted {
    color: var(--secondary-text-color);
    font-size: 0.9rem;
  }
  .chart {
    width: 100%;
    height: auto;
  }
  .chart .grid {
    stroke: var(--divider-color);
    stroke-width: 1;
  }
  .chart .grid.v {
    stroke-dasharray: 2 3;
  }
  .chart .tick {
    fill: var(--secondary-text-color);
    font-size: 9px;
  }
  .chart .threshold {
    stroke: var(--error-color, #c62828);
    stroke-width: 1;
    stroke-dasharray: 4 3;
    opacity: 0.8;
  }
  .chart .line {
    fill: none;
    stroke: var(--primary-color);
    stroke-width: 2;
  }
  .chart .pt {
    fill: var(--primary-color);
  }
  .chart .pt.fever {
    fill: var(--error-color, #c62828);
  }
  .item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 0;
    border-bottom: 1px solid var(--divider-color);
    --mdc-icon-size: 20px;
    color: var(--secondary-text-color);
  }
  .item:last-child {
    border-bottom: none;
  }
  .item.fever .t {
    color: var(--error-color, #c62828);
  }
  .item .t {
    color: var(--primary-text-color);
  }
  .when {
    font-size: 0.8rem;
    color: var(--secondary-text-color);
    white-space: nowrap;
  }
  .icon-btn {
    background: none;
    border: none;
    padding: 4px;
    color: var(--secondary-text-color);
    border-radius: 50%;
    display: inline-flex;
  }
  .del-confirm {
    display: inline-flex;
    gap: 6px;
  }
  .more {
    margin-top: 6px;
    background: none;
    border: none;
    padding: 4px 0;
    color: var(--primary-color);
  }
  .footer {
    padding: 12px 16px 0;
    font-size: 0.75rem;
    color: var(--secondary-text-color);
  }
`;var ue="child_health",pe=3e4,me=5*6e4,Zt=8;function Gt(r){return r&&typeof r=="object"&&"message"in r?String(r.message):String(r)}var Z=class extends g{constructor(){super();this._sig="";this._lastFetch=0;this._fetching=!1;this._again=!1;this._children=[],this._panel=null,this._tempText="",this._illnessText="",this._earlier=!1,this._earlierValue="",this._confirmDose=null,this._confirmDelete=null,this._showAll=!1,this._busy=!1,this._error=""}static{this.properties={hass:{attribute:!1},_config:{state:!0},_children:{state:!0},_history:{state:!0},_panel:{state:!0},_tempText:{state:!0},_illnessText:{state:!0},_earlier:{state:!0},_earlierValue:{state:!0},_confirmDose:{state:!0},_confirmDelete:{state:!0},_showAll:{state:!0},_busy:{state:!0},_error:{state:!0}}}static{this.styles=Jt}static getConfigElement(){return document.createElement("child-health-card-editor")}static getStubConfig(){return{}}setConfig(e){if(!e)throw new Error("Invalid configuration");this._config={show_chart:!0,show_timeline:!0,...e,days:this._clampDays(e.days)},this._sig=""}getCardSize(){return 8}connectedCallback(){super.connectedCallback(),this._timer=window.setInterval(()=>this._tick(),pe),this._refreshAll()}disconnectedCallback(){window.clearInterval(this._timer),window.clearTimeout(this._refreshTimer),super.disconnectedCallback()}willUpdate(e){(e.has("hass")||e.has("_config"))&&this._syncWithHass()}_tick(){this.requestUpdate(),Date.now()-this._lastFetch>me&&this._refreshAll()}_syncWithHass(){if(!this.hass||!this._config)return;let e=this._child();if(!e){!this._fetching&&Date.now()-this._lastFetch>1e4&&this._refreshAll();return}let s=vt(this.hass,$t(e));if(s===this._sig)return;let i=this._sig==="";this._sig=s,i?this._refreshAll():(window.clearTimeout(this._refreshTimer),this._refreshTimer=window.setTimeout(()=>void this._refreshAll(),400))}_clampDays(e){let s=Number(e);return Number.isFinite(s)&&s>=1?Math.min(14,Math.round(s)):3}_child(){let e=this._config;if(e){if(e.entry_id)return this._children.find(s=>s.entry_id===e.entry_id);if(e.child){let s=e.child.toLowerCase();return this._children.find(i=>i.name.toLowerCase()===s)}}}async _refreshAll(){if(this.hass){if(this._fetching){this._again=!0;return}this._fetching=!0;try{do this._again=!1,await this._fetchOnce();while(this._again)}finally{this._fetching=!1}}}async _fetchOnce(){let e=this.hass;if(e)try{this._children=await e.callWS({type:"child_health/children"}),this._lastFetch=Date.now();let s=this._child();s&&(this._history=await this._service("get_history",{days:this._config?.days??3},!0,s),this._sig=vt(e,$t(s))),this._error=""}catch(s){this._error=Gt(s)}}async _service(e,s,i,n=this._child()){if(!this.hass||!n)throw new Error("Child not loaded");return(await this.hass.callWS({type:"call_service",domain:ue,service:e,service_data:{config_entry:n.entry_id,...s},return_response:i})).response}_occurredAt(){let e=this._earlier?Ft(this._earlierValue):void 0;return e?{occurred_at:e}:{}}_toast(e){this.dispatchEvent(new CustomEvent("hass-notification",{detail:{message:e},bubbles:!0,composed:!0}))}async _run(e){if(!this._busy){this._busy=!0,this._error="";try{await e()!==!1&&(this._earlier=!1,this._earlierValue="",await this._refreshAll())}catch(s){this._error=Gt(s)}finally{this._busy=!1}}}_logSymptom(e){return this._run(async()=>{await this._service("log_symptom",{symptom:e.name,...this._occurredAt()},!0),this._toast(`${e.name} logged`)})}_logTemperature(){return this._run(async()=>{let e=Vt(this._tempText);if(e===null)return this._error="Enter a temperature like 38.4",!1;await this._service("log_temperature",{temperature:e,...this._occurredAt()},!0),this._tempText="",this._panel=null,this._toast(`Temperature ${e} logged`)})}_logDose(e,s=!1){return this._run(async()=>{let i=await this._service("log_dose",{medicine:e.name,fail_if_too_soon:!1,override:s,...this._occurredAt()},!0);if(!i.logged&&i.too_soon)return this._confirmDose={medicine:e.name,next:Date.parse(i.next_dose_allowed??"")},!1;this._confirmDose=null,this._toast(`${e.name} logged`)})}_startIllness(){return this._run(async()=>{let e=this._illnessText.trim();await this._service("start_episode",{...e?{illness:e}:{},...this._occurredAt()},!0),this._illnessText="",this._panel=null})}_endIllness(){return this._run(async()=>{await this._service("end_episode",this._occurredAt(),!0)})}_delete(e){return this._run(async()=>{await this._service("delete_entry",{kind:e.kind,record_id:e.id},!1),this._confirmDelete=null})}_togglePanel(e){this._panel=this._panel===e?null:e,this._confirmDose=null}_toggleEarlier(){this._earlier=!this._earlier,this._earlier&&!this._earlierValue&&(this._earlierValue=ft(Date.now()))}render(){let e=this._config;if(!e)return d;if(!e.entry_id&&!e.child)return c`<ha-card><div class="empty">Choose a child in the card settings.</div></ha-card>`;let s=this._child();if(!s||!this.hass){let n=this._error||(this._children.length?"That child wasn't found.":"Loading\u2026");return c`<ha-card><div class="empty">${n}</div></ha-card>`}let i=Date.now();return c`
      <ha-card>
        ${this._header(s,i)}
        ${this._error?c`<div class="error" role="alert">${this._error}</div>`:d}
        ${this._status(s,i)} ${this._actions(s,i)} ${this._panels(s,i)}
        ${e.show_chart===!1?d:this._chart(s,i)}
        ${e.show_timeline===!1?d:this._timeline(s,i)}
        <div class="footer">
          Records only. Doses use the gap you set from the medicine label; this card never suggests a dose.
        </div>
      </ha-card>
    `}_header(e,s){let i=this.hass,n=Bt(e,i),o=gt(e,i),a=Kt(e,i);return c`
      <div class="header">
        <div class="name">${this._config?.title||e.name}</div>
        <div class="chips">
          ${o.ill?c`<span class="chip warn"><ha-icon icon="mdi:emoticon-sick"></ha-icon>${o.illness?`Ill: ${o.illness}`:"Ill"}</span>`:c`<span class="chip ok"><ha-icon icon="mdi:emoticon-happy-outline"></ha-icon>Well</span>`}
          ${n?c`<span class="chip ${n.fever?"bad":"ok"}"
                ><ha-icon icon="mdi:thermometer"></ha-icon>${n.value}${e.unit_symbol}${n.recordedAt?` \xB7 ${J(s-n.recordedAt.getTime())}`:""}</span
              >`:d}
          ${a?c`<span class="chip ${s>=a.getTime()?"warn":"info"}"
                ><ha-icon icon="mdi:thermometer-alert"></ha-icon>${s>=a.getTime()?"Recheck now":`Recheck in ${j(a.getTime()-s)}`}</span
              >`:d}
        </div>
      </div>
    `}_status(e,s){if(!e.symptoms.length&&!e.medicines.length)return d;let i=this.hass,n=i.locale?.language;return c`
      <div class="status">
        ${e.symptoms.map(o=>{let a=Wt(o,i,s),l=a.last?`Last ${J(s-a.last.getTime())}`:"";return c`
            <div class="row" data-kind="symptom">
              <ha-icon icon=${a.clear?"mdi:check-circle-outline":"mdi:timer-sand"}></ha-icon>
              <div class="grow">
                <div class="label">${o.name}</div>
                ${l?c`<div class="sub">${l}</div>`:d}
                ${a.clear?d:c`<div class="bar"><div class="fill" style="width:${Math.round(a.progress*100)}%"></div></div>`}
              </div>
              ${a.clear?a.last?c`<div class="value ok">All clear</div>`:c`<div class="value muted">None logged</div>`:c`<div class="value warn">
                    Clear in ${j(a.clearAt.getTime()-s)}
                  </div>`}
            </div>
          `})}
        ${e.medicines.map(o=>{let a=_t(o,i,s),l=a.last?`Last ${J(s-a.last.getTime())}`:"Not given yet";return c`
            <div class="row" data-kind="medicine">
              <ha-icon icon=${a.allowed?"mdi:pill":"mdi:pill-off"}></ha-icon>
              <div class="grow">
                <div class="label">${o.name}</div>
                <div class="sub">
                  ${l}${!a.allowed&&a.next?` \xB7 allowed from ${V(a.next.getTime(),s,n)}`:""}
                </div>
              </div>
              ${a.allowed?c`<div class="value ok">Allowed now</div>`:c`<div class="value warn">In ${j(a.next.getTime()-s)}</div>`}
            </div>
          `})}
      </div>
    `}_actions(e,s){let i=this.hass,n=gt(e,i);return c`
      <div class="actions">
        ${e.symptoms.map(o=>c`<button class="act" ?disabled=${this._busy} @click=${()=>this._logSymptom(o)}>
            <ha-icon icon="mdi:emoticon-sick-outline"></ha-icon>${o.name}
          </button>`)}
        <button class="act ${this._panel==="temperature"?"on":""}" @click=${()=>this._togglePanel("temperature")}>
          <ha-icon icon="mdi:thermometer-plus"></ha-icon>Temperature
        </button>
        ${e.medicines.map(o=>{let a=_t(o,i,s).allowed;return c`<button
            class="act ${a?"":"caution"}"
            ?disabled=${this._busy}
            @click=${()=>this._logDose(o)}
          >
            <ha-icon icon=${a?"mdi:pill":"mdi:pill-off"}></ha-icon>${o.name}
          </button>`})}
        ${n.ill?c`<button class="act" ?disabled=${this._busy} @click=${()=>this._endIllness()}>
              <ha-icon icon="mdi:check-circle-outline"></ha-icon>End illness
            </button>`:c`<button class="act ${this._panel==="illness"?"on":""}" @click=${()=>this._togglePanel("illness")}>
              <ha-icon icon="mdi:medical-bag"></ha-icon>Start illness
            </button>`}
        <button class="act ${this._earlier?"on":""}" @click=${()=>this._toggleEarlier()}>
          <ha-icon icon="mdi:history"></ha-icon>Earlier?
        </button>
      </div>
    `}_panels(e,s){let i=this.hass?.locale?.language;return c`
      ${this._earlier?c`<div class="panel">
            <label>
              When
              <input
                type="datetime-local"
                max=${ft(s)}
                .value=${this._earlierValue}
                @input=${n=>this._earlierValue=n.target.value}
              />
            </label>
            <span class="hint">Applies to the next entry you log.</span>
          </div>`:d}
      ${this._panel==="temperature"?c`<div class="panel">
            <input
              class="temp"
              type="text"
              inputmode="decimal"
              placeholder="e.g. 38.4"
              aria-label="Temperature"
              .value=${this._tempText}
              @input=${n=>this._tempText=n.target.value}
              @keydown=${n=>n.key==="Enter"&&this._logTemperature()}
            />
            <span class="hint">${e.unit_symbol}</span>
            <button class="primary" ?disabled=${this._busy} @click=${()=>this._logTemperature()}>Log</button>
            <button class="ghost" @click=${()=>this._panel=null}>Cancel</button>
          </div>`:d}
      ${this._panel==="illness"?c`<div class="panel">
            <input
              type="text"
              placeholder="Illness (optional)"
              aria-label="Illness"
              .value=${this._illnessText}
              @input=${n=>this._illnessText=n.target.value}
              @keydown=${n=>n.key==="Enter"&&this._startIllness()}
            />
            <button class="primary" ?disabled=${this._busy} @click=${()=>this._startIllness()}>Start</button>
            <button class="ghost" @click=${()=>this._panel=null}>Cancel</button>
          </div>`:d}
      ${this._confirmDose?c`<div class="panel caution" role="alert">
            <div class="msg">
              ${e.name} had ${this._confirmDose.medicine} recently. Based on the gap you set, the next dose is allowed
              from ${V(this._confirmDose.next,s,i)}.
            </div>
            <button
              class="danger"
              ?disabled=${this._busy}
              @click=${()=>{let n=e.medicines.find(o=>o.name===this._confirmDose?.medicine);n&&this._logDose(n,!0)}}
            >
              Log anyway
            </button>
            <button class="ghost" @click=${()=>this._confirmDose=null}>Cancel</button>
          </div>`:d}
    `}_chart(e,s){let i=this._config?.days??3,n=this.hass?.locale?.language,o=Yt(this._history?.temperatures??[],e.fever_threshold,s,i,320,140,n),a=D.left,l=o.width-D.right;return c`
      <div class="section">
        <div class="section-title">Temperature · last ${i} ${i===1?"day":"days"}</div>
        ${o.empty?c`<div class="muted">No temperatures logged in this time.</div>`:c`<svg class="chart" viewBox="0 0 ${o.width} ${o.height}" role="img" aria-label="Temperature chart">
              ${o.yTicks.map(u=>L`<line class="grid" x1=${a} x2=${l} y1=${u.y} y2=${u.y}></line>
                  <text class="tick" x=${a-4} y=${u.y+3} text-anchor="end">${u.label}</text>`)}
              ${o.xTicks.map(u=>L`<line class="grid v" x1=${u.x} x2=${u.x} y1=${D.top} y2=${o.height-D.bottom}></line>
                  <text class="tick" x=${u.x} y=${o.height-8} text-anchor="middle">${u.label}</text>`)}
              <line class="threshold" x1=${a} x2=${l} y1=${o.thresholdY} y2=${o.thresholdY}></line>
              ${o.path?L`<path class="line" d=${o.path}></path>`:d}
              ${o.points.map(u=>L`<circle class="pt ${u.fever?"fever":""}" cx=${u.x} cy=${u.y} r="3.5">
                  <title>${u.value}${e.unit_symbol} · ${V(u.at,s,n)}</title>
                </circle>`)}
            </svg>`}
      </div>
    `}_timeline(e,s){if(!this._history)return d;let i=this.hass?.locale?.language,n=qt(this._history,e);if(n.length===0)return c`<div class="section"><div class="section-title">Recent</div><div class="muted">Nothing logged yet.</div></div>`;let o=this._showAll?n:n.slice(0,Zt);return c`
      <div class="section">
        <div class="section-title">Recent</div>
        ${o.map(a=>c`
            <div class="item ${a.fever?"fever":""}" data-id=${a.id}>
              <ha-icon icon=${a.icon}></ha-icon>
              <div class="grow">
                <div class="t">${a.title}</div>
                ${a.detail?c`<div class="sub">${a.detail}</div>`:d}
              </div>
              <div class="when">${V(a.at,s,i)}</div>
              ${this._confirmDelete===a.id?c`<span class="del-confirm">
                    <button class="danger" ?disabled=${this._busy} @click=${()=>this._delete(a)}>Delete</button>
                    <button class="ghost" @click=${()=>this._confirmDelete=null}>Keep</button>
                  </span>`:c`<button
                    class="icon-btn"
                    title="Delete"
                    aria-label="Delete entry"
                    @click=${()=>this._confirmDelete=a.id}
                  >
                    <ha-icon icon="mdi:delete-outline"></ha-icon>
                  </button>`}
            </div>
          `)}
        ${n.length>Zt?c`<button class="more" @click=${()=>this._showAll=!this._showAll}>
              ${this._showAll?"Show less":`Show all ${n.length}`}
            </button>`:d}
      </div>
    `}};var fe=[{name:"entry_id",selector:{config_entry:{integration:"child_health"}}},{name:"title",selector:{text:{}}},{name:"days",selector:{number:{min:1,max:14,mode:"box"}}},{name:"show_chart",selector:{boolean:{}}},{name:"show_timeline",selector:{boolean:{}}}],_e={entry_id:"Child",title:"Title (optional)",days:"Days of history",show_chart:"Show temperature chart",show_timeline:"Show recent entries"},G=class extends g{static{this.properties={hass:{attribute:!1},_config:{state:!0}}}setConfig(t){this._config=t}render(){if(!this.hass||!this._config)return d;let t={show_chart:!0,show_timeline:!0,days:3,...this._config};return c`<ha-form
      .hass=${this.hass}
      .data=${t}
      .schema=${fe}
      .computeLabel=${e=>_e[e.name]??e.name}
      @value-changed=${this._changed}
    ></ha-form>`}_changed(t){let e={...this._config,...t.detail.value};this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:e},bubbles:!0,composed:!0}))}};customElements.get("child-health-card")||customElements.define("child-health-card",Z);customElements.get("child-health-card-editor")||customElements.define("child-health-card-editor",G);window.customCards=window.customCards||[];window.customCards.some(r=>r.type==="child-health-card")||window.customCards.push({type:"child-health-card",name:"Child Health",description:"Log symptoms, temperatures and medicines for a child, with all-clear and next-dose countdowns.",preview:!1,documentationURL:"https://github.com/th0mashoward/ha_child_health"});
