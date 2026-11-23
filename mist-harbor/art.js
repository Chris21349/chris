/* ================================================================== */
/* 雾港未眠 · 场景与人物剪影                                           */
/* ================================================================== */

const SCENE_ART = {

  studio: `
  <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="st-room" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1b1a18"/>
        <stop offset="0.48" stop-color="#100f0f"/>
        <stop offset="1" stop-color="#06090b"/>
      </linearGradient>
      <linearGradient id="st-window" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#314a57"/>
        <stop offset="0.5" stop-color="#1a2f3b"/>
        <stop offset="1" stop-color="#09131a"/>
      </linearGradient>
      <linearGradient id="st-floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0c0d0e"/>
        <stop offset="1" stop-color="#05080a"/>
      </linearGradient>
      <radialGradient id="st-red" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#cb5b49" stop-opacity="0.45"/>
        <stop offset="0.5" stop-color="#7a2d29" stop-opacity="0.18"/>
        <stop offset="1" stop-color="#7a2d29" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="st-lamp" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#e4bd7d" stop-opacity="0.62"/>
        <stop offset="0.4" stop-color="#c08d4f" stop-opacity="0.18"/>
        <stop offset="1" stop-color="#c08d4f" stop-opacity="0"/>
      </radialGradient>
      <filter id="st-glow"><feGaussianBlur stdDeviation="22"/></filter>
      <filter id="st-soft"><feGaussianBlur stdDeviation="4"/></filter>
    </defs>
    <rect width="1600" height="900" fill="url(#st-room)"/>
    <rect x="0" y="650" width="1600" height="250" fill="url(#st-floor)"/>
    <g opacity="0.86">
      <rect x="105" y="125" width="452" height="552" fill="url(#st-window)"/>
      <rect x="105" y="125" width="452" height="552" fill="#8ab4c0" opacity="0.04"/>
      <g stroke="#272a2a" stroke-width="16">
        <line x1="331" y1="125" x2="331" y2="677"/>
        <line x1="105" y1="405" x2="557" y2="405"/>
      </g>
      <rect x="89" y="109" width="484" height="584" fill="none" stroke="#0a0b0b" stroke-width="18"/>
      <g stroke="#a8c7d0" stroke-width="1" opacity="0.33">
        <line x1="150" y1="160" x2="126" y2="255"/><line x1="220" y1="180" x2="190" y2="300"/>
        <line x1="290" y1="150" x2="260" y2="265"/><line x1="380" y1="185" x2="348" y2="310"/>
        <line x1="450" y1="145" x2="420" y2="260"/><line x1="505" y1="220" x2="474" y2="340"/>
        <line x1="160" y1="430" x2="132" y2="548"/><line x1="245" y1="460" x2="216" y2="580"/>
        <line x1="395" y1="440" x2="366" y2="560"/><line x1="490" y1="470" x2="460" y2="590"/>
      </g>
      <g opacity="0.4" fill="#152630">
        <path d="M0 690 L0 580 L80 545 L148 565 L226 520 L318 560 L390 546 L470 585 L560 552 L620 590 L620 900 L0 900Z"/>
      </g>
    </g>
    <circle cx="1340" cy="260" r="430" fill="url(#st-red)"/>
    <circle cx="1330" cy="258" r="13" fill="#d86b54" opacity="0.7"/>
    <circle cx="1330" cy="258" r="66" fill="#c74f41" opacity="0.09" filter="url(#st-glow)"/>
    <g stroke="#37322d" stroke-width="2">
      <path d="M800 100 C940 145 1080 140 1210 100"/>
      <path d="M830 100 L830 180"/><path d="M940 127 L940 220"/><path d="M1050 132 L1050 236"/><path d="M1150 117 L1150 202"/>
    </g>
    <g transform="translate(806 173) rotate(-2)" opacity="0.8">
      <rect width="90" height="122" fill="#d8cdb8" opacity="0.5"/>
      <rect x="7" y="7" width="76" height="90" fill="#26363b"/>
      <path d="M18 84 L43 50 L61 70 L74 56 L74 96 L18 96Z" fill="#101b20"/>
      <circle cx="30" cy="32" r="9" fill="#8f9f9e" opacity="0.45"/>
    </g>
    <g transform="translate(918 208) rotate(2)" opacity="0.7">
      <rect width="76" height="104" fill="#d8cdb8" opacity="0.42"/>
      <rect x="6" y="6" width="64" height="76" fill="#304044"/>
      <path d="M13 70 L33 39 L50 60 L64 46 L64 78 L13 78Z" fill="#111c20"/>
    </g>
    <g transform="translate(1027 225) rotate(-3)" opacity="0.66">
      <rect width="83" height="108" fill="#d8cdb8" opacity="0.4"/>
      <rect x="6" y="7" width="71" height="78" fill="#27363a"/>
      <path d="M13 75 L35 44 L51 65 L69 48 L69 84 L13 84Z" fill="#0f191d"/>
    </g>
    <g opacity="0.85">
      <rect x="760" y="550" width="610" height="26" fill="#141110"/>
      <rect x="780" y="576" width="24" height="220" fill="#0a0b0b"/>
      <rect x="1324" y="576" width="24" height="220" fill="#0a0b0b"/>
      <rect x="810" y="518" width="160" height="32" rx="2" fill="#171412" stroke="#2d2723"/>
      <rect x="822" y="524" width="136" height="20" fill="#0b0d0e"/>
      <rect x="1030" y="470" width="263" height="80" fill="#171411" stroke="#2c2520"/>
      <path d="M1048 486 H1274 M1048 505 H1246 M1048 524 H1260" stroke="#3b332c" stroke-width="1.5" opacity="0.7"/>
      <circle cx="1250" cy="620" r="52" fill="url(#st-lamp)"/>
      <path d="M1222 610 C1240 586 1268 588 1282 610 L1272 626 L1232 626Z" fill="#4b3b29"/>
      <path d="M1250 626 L1250 676 M1228 676 H1275" stroke="#5d4a31" stroke-width="3"/>
    </g>
    <g opacity="0.5" fill="#7c6b54">
      <circle cx="700" cy="320" r="1.5"/><circle cx="1120" cy="380" r="1"/><circle cx="970" cy="470" r="1.2"/>
      <circle cx="640" cy="520" r="1"/><circle cx="1180" cy="300" r="1.4"/>
    </g>
  </svg>`,

  theater: `
  <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="th-bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#160d0e"/>
        <stop offset="0.48" stop-color="#0e0b0c"/>
        <stop offset="1" stop-color="#060708"/>
      </linearGradient>
      <linearGradient id="th-stage" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#4f3829" stop-opacity="0.36"/>
        <stop offset="1" stop-color="#120d0b" stop-opacity="0.1"/>
      </linearGradient>
      <linearGradient id="th-curtain" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#3b1719"/>
        <stop offset="0.5" stop-color="#1e0c0e"/>
        <stop offset="1" stop-color="#0c0809"/>
      </linearGradient>
      <radialGradient id="th-glow" cx="0.5" cy="0.55" r="0.55">
        <stop offset="0" stop-color="#e0b679" stop-opacity="0.31"/>
        <stop offset="0.48" stop-color="#9f7147" stop-opacity="0.1"/>
        <stop offset="1" stop-color="#9f7147" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="th-lamp" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#f4dfb1" stop-opacity="0.8"/>
        <stop offset="1" stop-color="#f4dfb1" stop-opacity="0"/>
      </radialGradient>
      <filter id="th-blur"><feGaussianBlur stdDeviation="18"/></filter>
    </defs>
    <rect width="1600" height="900" fill="url(#th-bg)"/>
    <rect x="0" y="0" width="1600" height="900" fill="url(#th-glow)"/>
    <g fill="url(#th-curtain)" opacity="0.92">
      <path d="M0 0 H430 C390 120 360 270 350 410 C335 590 385 730 420 900 H0Z"/>
      <path d="M1600 0 H1170 C1210 120 1240 270 1250 410 C1265 590 1215 730 1180 900 H1600Z"/>
      <path d="M0 0 H230 C250 110 210 260 190 390 C170 540 200 700 250 900 H0Z" opacity="0.55"/>
      <path d="M1600 0 H1370 C1350 110 1390 260 1410 390 C1430 540 1400 700 1350 900 H1600Z" opacity="0.55"/>
    </g>
    <g stroke="#b28a58" fill="none" opacity="0.56">
      <path d="M254 850 V330 C254 176 500 92 800 92 C1100 92 1346 176 1346 330 V850" stroke-width="2.5"/>
      <path d="M285 850 V345 C285 204 510 126 800 126 C1090 126 1315 204 1315 345 V850" stroke-width="0.8" opacity="0.6"/>
      <path d="M330 850 V710 M1270 850 V710" stroke-width="1"/>
    </g>
    <path d="M0 735 H1600 V900 H0Z" fill="#08090a"/>
    <path d="M310 735 C440 688 620 662 800 662 C980 662 1160 688 1290 735 L1600 900 H0Z" fill="url(#th-stage)"/>
    <g opacity="0.72">
      <path d="M800 0 V130" stroke="#5d4b36" stroke-width="2"/>
      <path d="M800 132 C742 132 700 170 700 218 C700 270 744 306 800 306 C856 306 900 270 900 218 C900 170 858 132 800 132Z" fill="none" stroke="#987548" stroke-width="2"/>
      <circle cx="800" cy="218" r="46" fill="url(#th-lamp)"/>
      <g fill="#e9d3a0" opacity="0.8">
        <circle cx="800" cy="188" r="3"/><circle cx="832" cy="207" r="3"/><circle cx="830" cy="242" r="3"/>
        <circle cx="800" cy="258" r="3"/><circle cx="770" cy="242" r="3"/><circle cx="768" cy="207" r="3"/>
      </g>
      <g stroke="#7d623d" stroke-width="1" opacity="0.7">
        <path d="M800 132 L800 176 M800 260 L800 306 M762 218 L744 218 M856 218 L874 218"/>
      </g>
    </g>
    <g fill="#070809" opacity="0.95">
      <path d="M0 900 V822 C130 790 270 774 420 780 C470 760 500 752 540 757 C560 735 600 728 640 738 C675 724 700 726 720 745 C760 728 812 735 840 760 C880 745 920 750 948 776 C1000 764 1050 772 1080 792 C1180 778 1340 790 1460 820 C1510 832 1560 844 1600 860 V900Z"/>
      <circle cx="330" cy="765" r="26"/><circle cx="690" cy="725" r="24"/><circle cx="1060" cy="748" r="24"/><circle cx="1315" cy="779" r="26"/>
      <path d="M280 900 C290 840 370 820 430 830 C470 838 500 864 500 900Z" opacity="0.65"/>
      <path d="M640 900 C650 830 720 806 784 820 C824 830 850 860 856 900Z" opacity="0.58"/>
      <path d="M1000 900 C1010 840 1080 816 1140 828 C1180 838 1200 868 1206 900Z" opacity="0.62"/>
    </g>
    <g opacity="0.25" stroke="#d8b276" fill="none">
      <path d="M450 900 C470 760 550 640 700 590"/>
      <path d="M1150 900 C1130 760 1050 640 900 590"/>
    </g>
  </svg>`,

  lighthouse: `
  <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="lh-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#07131d"/>
        <stop offset="0.55" stop-color="#0b2029"/>
        <stop offset="1" stop-color="#102f36"/>
      </linearGradient>
      <linearGradient id="lh-sea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#17363e"/>
        <stop offset="0.5" stop-color="#0b2029"/>
        <stop offset="1" stop-color="#051016"/>
      </linearGradient>
      <linearGradient id="lh-beam" x1="1" y1="0" x2="0" y2="0">
        <stop offset="0" stop-color="#f2dfb1" stop-opacity="0.5"/>
        <stop offset="0.48" stop-color="#d4e1d8" stop-opacity="0.12"/>
        <stop offset="1" stop-color="#d4e1d8" stop-opacity="0"/>
      </linearGradient>
      <radialGradient id="lh-moon" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#f4e6c7" stop-opacity="0.95"/>
        <stop offset="0.54" stop-color="#dfd2b5" stop-opacity="0.3"/>
        <stop offset="1" stop-color="#d8cdb3" stop-opacity="0"/>
      </radialGradient>
      <filter id="lh-glow"><feGaussianBlur stdDeviation="28"/></filter>
      <filter id="lh-soft"><feGaussianBlur stdDeviation="5"/></filter>
    </defs>
    <rect width="1600" height="900" fill="url(#lh-sky)"/>
    <circle cx="1120" cy="215" r="230" fill="url(#lh-moon)"/>
    <circle cx="1120" cy="215" r="70" fill="#e9dfc8" opacity="0.8"/>
    <circle cx="1092" cy="196" r="13" fill="#c7bca5" opacity="0.3"/>
    <circle cx="1140" cy="242" r="20" fill="#c7bca5" opacity="0.2"/>
    <path d="M0 622 C200 602 340 618 520 612 C720 604 880 626 1060 616 C1270 604 1440 620 1600 600 V900 H0Z" fill="url(#lh-sea)"/>
    <g stroke="#b8d0ce" stroke-width="1" opacity="0.17">
      <path d="M0 655 C180 642 300 665 480 652 C680 638 820 662 1000 650 C1220 636 1400 654 1600 642"/>
      <path d="M0 690 C220 674 380 700 560 684 C760 666 920 694 1100 678 C1300 660 1460 686 1600 672"/>
      <path d="M0 742 C180 728 340 750 520 736 C740 718 900 746 1080 730 C1270 714 1440 738 1600 724"/>
      <path d="M0 810 C200 790 380 818 580 798 C800 776 960 808 1160 788 C1340 770 1480 794 1600 782"/>
    </g>
    <g fill="#e5cf9d" opacity="0.24">
      <path d="M1088 650 L1152 650 L1138 708 L1098 708Z"/>
      <path d="M1080 736 L1160 736 L1144 800 L1094 800Z"/>
      <path d="M1070 830 L1172 830 L1152 900 L1090 900Z"/>
    </g>
    <g class="beam">
      <path d="M1318 288 L40 78 L40 488 L1318 330Z" fill="url(#lh-beam)" opacity="0.65"/>
      <path d="M1318 288 L410 180 L410 396 L1318 330Z" fill="#f1e4c4" opacity="0.05"/>
    </g>
    <g>
      <path d="M1272 900 L1302 365 H1362 L1392 900Z" fill="#0b1216"/>
      <path d="M1302 365 L1362 365 L1354 434 L1310 434Z" fill="#18252b"/>
      <g opacity="0.42" stroke="#7f9291" stroke-width="1">
        <path d="M1300 478 H1364 M1296 548 H1368 M1291 620 H1373 M1286 700 H1378 M1280 790 H1384"/>
      </g>
      <rect x="1292" y="300" width="80" height="66" fill="#0b1216"/>
      <rect x="1302" y="311" width="60" height="38" fill="#d9c795" opacity="0.23"/>
      <path d="M1284 298 H1380 L1360 266 H1304Z" fill="#0a1013"/>
      <circle cx="1332" cy="261" r="70" fill="#e8d6a7" opacity="0.12" filter="url(#lh-glow)"/>
      <path d="M1318 262 H1346" stroke="#f2e0b1" stroke-width="2" opacity="0.65"/>
    </g>
    <path d="M0 900 L0 760 C90 735 180 742 260 770 C350 802 400 860 460 900Z" fill="#050a0d"/>
    <path d="M1600 900 V782 C1510 760 1430 770 1370 804 C1320 834 1280 872 1250 900Z" fill="#050a0d"/>
    <g fill="#081015">
      <path d="M0 900 V828 C50 808 120 812 170 840 C190 852 210 874 218 900Z"/>
      <path d="M1460 900 C1480 858 1524 832 1600 824 V900Z"/>
    </g>
    <g fill="#e9d8b4" opacity="0.4">
      <circle cx="920" cy="748" r="2"/><circle cx="1010" cy="786" r="1.5"/><circle cx="824" cy="842" r="1.5"/>
      <circle cx="208" cy="656" r="1"/><circle cx="700" cy="690" r="1.2"/>
    </g>
  </svg>`,

  archive: `
  <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ar-bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#101a18"/>
        <stop offset="0.6" stop-color="#0b1211"/>
        <stop offset="1" stop-color="#060a09"/>
      </linearGradient>
      <linearGradient id="ar-window" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2b4349"/>
        <stop offset="1" stop-color="#0c1b20"/>
      </linearGradient>
      <radialGradient id="ar-lamp" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#ecc07a" stop-opacity="0.65"/>
        <stop offset="0.4" stop-color="#b8753d" stop-opacity="0.18"/>
        <stop offset="1" stop-color="#b8753d" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="ar-desk" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2b2118"/>
        <stop offset="1" stop-color="#0b0907"/>
      </linearGradient>
      <filter id="ar-blur"><feGaussianBlur stdDeviation="24"/></filter>
    </defs>
    <rect width="1600" height="900" fill="url(#ar-bg)"/>
    <g opacity="0.8">
      <rect x="0" y="0" width="1600" height="610" fill="#0b1413"/>
      <g stroke="#1e2a26" stroke-width="1">
        <path d="M0 114 H1600 M0 250 H1600 M0 386 H1600 M0 522 H1600"/>
      </g>
      <g opacity="0.55">
        <rect x="44" y="58" width="58" height="180" fill="#26342e"/>
        <rect x="116" y="76" width="46" height="162" fill="#1b2825"/>
        <rect x="174" y="47" width="72" height="191" fill="#2c3930"/>
        <rect x="258" y="90" width="54" height="148" fill="#1e2a25"/>
        <rect x="324" y="58" width="66" height="180" fill="#26342e"/>
        <rect x="1204" y="54" width="64" height="184" fill="#26342e"/>
        <rect x="1280" y="82" width="48" height="156" fill="#1d2a26"/>
        <rect x="1340" y="52" width="70" height="186" fill="#2b3830"/>
        <rect x="1422" y="74" width="58" height="164" fill="#1b2723"/>
        <rect x="1492" y="48" width="76" height="190" fill="#27342d"/>
        <rect x="44" y="296" width="70" height="180" fill="#202e29"/>
        <rect x="124" y="320" width="52" height="156" fill="#2a3831"/>
        <rect x="188" y="290" width="64" height="186" fill="#1b2723"/>
        <rect x="266" y="314" width="54" height="162" fill="#28362f"/>
        <rect x="332" y="300" width="70" height="176" fill="#1e2b26"/>
        <rect x="1220" y="302" width="58" height="174" fill="#2a3831"/>
        <rect x="1290" y="322" width="76" height="154" fill="#1c2924"/>
        <rect x="1378" y="296" width="56" height="180" fill="#27342e"/>
        <rect x="1446" y="318" width="64" height="158" fill="#1f2c27"/>
        <rect x="1520" y="294" width="60" height="182" fill="#2c3931"/>
      </g>
      <rect x="552" y="90" width="494" height="420" fill="url(#ar-window)" opacity="0.85"/>
      <g stroke="#151d1b" stroke-width="15">
        <line x1="799" y1="90" x2="799" y2="510"/>
        <line x1="552" y1="300" x2="1046" y2="300"/>
      </g>
      <rect x="530" y="70" width="538" height="460" fill="none" stroke="#080d0c" stroke-width="18"/>
      <g stroke="#8ea9a4" stroke-width="1" opacity="0.2">
        <line x1="600" y1="120" x2="580" y2="270"/><line x1="680" y1="160" x2="650" y2="360"/>
        <line x1="740" y1="110" x2="715" y2="280"/><line x1="880" y1="130" x2="858" y2="330"/>
        <line x1="960" y1="180" x2="932" y2="380"/><line x1="1010" y1="110" x2="990" y2="260"/>
      </g>
    </g>
    <rect x="0" y="610" width="1600" height="290" fill="#060a08"/>
    <path d="M0 690 H1600 V900 H0Z" fill="url(#ar-desk)"/>
    <g>
      <circle cx="1080" cy="590" r="260" fill="url(#ar-lamp)"/>
      <path d="M1062 546 C1078 508 1128 508 1144 546 L1120 566 H1084Z" fill="#5d432b"/>
      <path d="M1103 566 V632 M1074 632 H1132" stroke="#57402a" stroke-width="4"/>
      <path d="M962 636 L1206 636 L1230 690 L938 690Z" fill="#241b13" opacity="0.8"/>
      <g transform="translate(930 592) rotate(-5)">
        <rect width="140" height="92" fill="#d6c9ae" opacity="0.35"/>
        <path d="M15 22 H120 M15 38 H102 M15 54 H113 M15 70 H82" stroke="#5a5142" stroke-width="1" opacity="0.65"/>
      </g>
      <g transform="translate(1140 620) rotate(7)" opacity="0.45">
        <rect width="120" height="84" fill="#d6c9ae" opacity="0.4"/>
        <path d="M14 20 H101 M14 36 H92 M14 52 H99" stroke="#5a5142" stroke-width="1"/>
      </g>
    </g>
    <g opacity="0.55">
      <path d="M190 690 L300 620 L412 690Z" fill="#1b2a26"/>
      <rect x="284" y="638" width="22" height="90" fill="#101b18"/>
      <path d="M1300 690 L1380 630 L1470 690Z" fill="#1a2824"/>
      <rect x="1385" y="646" width="18" height="80" fill="#101b18"/>
    </g>
    <g fill="#d7b778" opacity="0.15">
      <circle cx="1110" cy="680" r="1.5"/><circle cx="870" cy="720" r="1"/><circle cx="1250" cy="760" r="1.2"/>
      <circle cx="720" cy="660" r="1.2"/><circle cx="420" cy="740" r="1"/>
    </g>
  </svg>`,

  docks: `
  <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="dk-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0a1720"/>
        <stop offset="0.5" stop-color="#102730"/>
        <stop offset="1" stop-color="#18353b"/>
      </linearGradient>
      <linearGradient id="dk-sea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#15333a"/>
        <stop offset="1" stop-color="#050e13"/>
      </linearGradient>
      <radialGradient id="dk-moon" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#e8d9ba" stop-opacity="0.8"/>
        <stop offset="0.4" stop-color="#c9c1a9" stop-opacity="0.18"/>
        <stop offset="1" stop-color="#c9c1a9" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="dk-light" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#f4bd6e" stop-opacity="0.9"/>
        <stop offset="0.3" stop-color="#e09b4c" stop-opacity="0.3"/>
        <stop offset="1" stop-color="#e09b4c" stop-opacity="0"/>
      </radialGradient>
      <filter id="dk-blur"><feGaussianBlur stdDeviation="22"/></filter>
    </defs>
    <rect width="1600" height="900" fill="url(#dk-sky)"/>
    <circle cx="1240" cy="190" r="210" fill="url(#dk-moon)"/>
    <circle cx="1240" cy="190" r="58" fill="#d7d0bb" opacity="0.35"/>
    <path d="M0 570 C230 548 420 574 620 562 C820 550 1010 578 1210 562 C1370 550 1500 566 1600 556 V900 H0Z" fill="url(#dk-sea)"/>
    <g stroke="#a9c8c6" stroke-width="1" opacity="0.16">
      <path d="M0 618 C180 606 300 630 480 616 C700 600 850 626 1040 610 C1240 594 1420 622 1600 606"/>
      <path d="M0 680 C220 662 380 690 560 672 C760 652 930 684 1120 664 C1300 646 1470 674 1600 658"/>
      <path d="M0 760 C190 742 380 770 580 750 C800 726 970 758 1160 738 C1340 720 1480 746 1600 730"/>
    </g>
    <g fill="#071014">
      <path d="M1010 570 L1290 570 L1350 640 H950Z"/>
      <path d="M1040 548 H1240 V574 H1040Z"/>
      <path d="M1100 508 H1150 V552 H1100Z"/>
      <path d="M1165 504 H1230 V548 H1165Z"/>
      <path d="M990 640 H1360 V700 H990Z" opacity="0.74"/>
    </g>
    <g stroke="#0a1316" stroke-width="8" fill="none">
      <path d="M1440 620 V300 H1490"/>
      <path d="M1452 340 L1360 340 M1452 340 L1452 250"/>
      <path d="M1452 250 L1530 250 L1490 296"/>
      <path d="M1390 340 L1375 400"/>
      <path d="M1470 340 L1495 408"/>
    </g>
    <g fill="#d5a45e" opacity="0.55">
      <circle cx="1190" cy="628" r="2"/><circle cx="1300" cy="642" r="1.5"/><circle cx="980" cy="667" r="1.5"/>
      <circle cx="1450" cy="282" r="2"/><circle cx="1518" cy="282" r="1.5"/>
    </g>
    <g>
      <rect x="120" y="600" width="280" height="190" fill="#0a1317"/>
      <rect x="160" y="552" width="240" height="58" fill="#0d171b"/>
      <g stroke="#20343a" stroke-width="2" opacity="0.7">
        <path d="M150 640 H370 M150 690 H370 M150 740 H370"/>
        <path d="M210 600 V790 M280 600 V790 M340 600 V790"/>
      </g>
      <rect x="430" y="650" width="240" height="140" fill="#0a1418"/>
      <rect x="470" y="610" width="180" height="46" fill="#0d181c"/>
      <circle cx="465" cy="686" r="26" fill="none" stroke="#1e3035" stroke-width="6"/>
      <circle cx="630" cy="686" r="26" fill="none" stroke="#1e3035" stroke-width="6"/>
      <path d="M380 650 L470 590 L700 590 L780 650" fill="none" stroke="#0a1317" stroke-width="12"/>
    </g>
    <g fill="#e7bd78" opacity="0.5">
      <circle cx="1268" cy="384" r="26" fill="url(#dk-light)"/>
      <circle cx="1268" cy="384" r="3"/>
    </g>
    <path d="M0 900 V808 C60 790 110 794 150 812 C190 830 210 860 220 900Z" fill="#040a0d"/>
    <path d="M1600 900 V826 C1520 808 1460 822 1420 852 C1400 868 1388 884 1382 900Z" fill="#040a0d"/>
    <g stroke="#9dbcb9" stroke-width="1" opacity="0.12">
      <path d="M0 836 C170 814 300 844 470 824 C660 802 800 832 980 812 C1190 788 1370 820 1600 796"/>
    </g>
    <g opacity="0.45" fill="#c6d7d2">
      <circle cx="770" cy="602" r="1.2"/><circle cx="920" cy="640" r="1"/><circle cx="1430" cy="646" r="1.2"/>
      <circle cx="420" cy="560" r="1"/><circle cx="110" cy="560" r="1.2"/>
    </g>
  </svg>`,

  printshop: `
  <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pr-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#181510"/>
        <stop offset="0.55" stop-color="#0e0d0a"/>
        <stop offset="1" stop-color="#070806"/>
      </linearGradient>
      <linearGradient id="pr-paper" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#e5d9bf"/>
        <stop offset="1" stop-color="#b5a98e"/>
      </linearGradient>
      <radialGradient id="pr-lamp" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#f1bd72" stop-opacity="0.62"/>
        <stop offset="0.45" stop-color="#b46a35" stop-opacity="0.14"/>
        <stop offset="1" stop-color="#b46a35" stop-opacity="0"/>
      </radialGradient>
      <filter id="pr-blur"><feGaussianBlur stdDeviation="24"/></filter>
    </defs>
    <rect width="1600" height="900" fill="url(#pr-bg)"/>
    <rect x="0" y="0" width="1600" height="900" fill="#0a0a07" opacity="0.35"/>
    <g opacity="0.36">
      <rect x="90" y="90" width="380" height="460" fill="#28403f"/>
      <rect x="90" y="90" width="380" height="460" fill="#9dbcb4" opacity="0.07"/>
      <g stroke="#141c1a" stroke-width="14">
        <line x1="280" y1="90" x2="280" y2="550"/>
        <line x1="90" y1="320" x2="470" y2="320"/>
      </g>
      <g stroke="#acc8c2" stroke-width="1" opacity="0.2">
        <line x1="130" y1="130" x2="112" y2="280"/><line x1="210" y1="150" x2="190" y2="330"/>
        <line x1="340" y1="120" x2="320" y2="270"/><line x1="420" y1="170" x2="400" y2="350"/>
      </g>
    </g>
    <circle cx="1230" cy="280" r="330" fill="url(#pr-lamp)"/>
    <path d="M1198 200 V110 M1262 200 V110" stroke="#3b2c1d" stroke-width="2"/>
    <path d="M1170 200 C1170 176 1290 176 1290 200 L1272 262 H1188Z" fill="#3b2d1e"/>
    <path d="M1230 262 V340" stroke="#493824" stroke-width="2"/>
    <g>
      <path d="M690 90 C740 90 780 110 806 148 C760 170 724 206 710 250 C676 208 666 154 690 90Z" fill="#080a08"/>
      <path d="M830 90 C880 90 920 110 946 148 C900 170 864 206 850 250 C816 208 806 154 830 90Z" fill="#080a08"/>
      <path d="M965 90 C1015 90 1055 110 1081 148 C1035 170 999 206 985 250 C951 208 941 154 965 90Z" fill="#080a08"/>
      <g stroke="#494333" stroke-width="1">
        <path d="M0 300 C260 282 500 306 760 290 C1020 272 1300 300 1600 284"/>
        <path d="M0 420 C220 402 440 426 680 410 C960 390 1240 418 1600 398"/>
      </g>
      <g fill="#d8ccb3" opacity="0.55">
        <rect x="170" y="304" width="76" height="106" transform="rotate(-2 170 304)"/>
        <rect x="390" y="300" width="68" height="112" transform="rotate(3 390 300)"/>
        <rect x="640" y="296" width="88" height="116" transform="rotate(-1 640 296)"/>
        <rect x="900" y="292" width="72" height="110" transform="rotate(2 900 292)"/>
        <rect x="1160" y="296" width="86" height="114" transform="rotate(-3 1160 296)"/>
        <rect x="1390" y="292" width="64" height="108" transform="rotate(2 1390 292)"/>
      </g>
      <g opacity="0.4" stroke="#4c4738" stroke-width="1">
        <path d="M186 330 H232 M186 346 H222 M186 362 H238 M186 378 H216"/>
        <path d="M406 328 H444 M406 344 H436 M406 360 H448"/>
        <path d="M660 326 H708 M660 342 H696 M660 358 H712 M660 374 H688"/>
        <path d="M918 324 H954 M918 340 H948 M918 356 H960"/>
        <path d="M1176 326 H1230 M1176 342 H1218 M1176 358 H1232"/>
      </g>
    </g>
    <path d="M0 680 H1600 V900 H0Z" fill="#080806"/>
    <g>
      <rect x="870" y="470" width="510" height="250" fill="#11110d" stroke="#29251b"/>
      <rect x="910" y="510" width="360" height="110" fill="#070806"/>
      <g stroke="#3b3526" stroke-width="3" fill="none">
        <circle cx="1090" cy="560" r="82"/>
        <circle cx="1090" cy="560" r="46"/>
        <path d="M1090 478 V642 M1008 560 H1172 M1032 502 L1148 618 M1148 502 L1032 618"/>
      </g>
      <path d="M910 620 H1270 V654 H910Z" fill="#1d1a12"/>
      <rect x="1330" y="430" width="150" height="290" fill="#0c0d09"/>
      <g stroke="#2b2a1e" stroke-width="1">
        <path d="M1350 460 H1460 M1350 500 H1460 M1350 540 H1460 M1350 580 H1460"/>
      </g>
    </g>
    <g transform="translate(1180 665) rotate(-4)" opacity="0.6">
      <rect width="190" height="140" fill="url(#pr-paper)" opacity="0.55"/>
      <path d="M24 30 H160 M24 52 H142 M24 74 H152 M24 96 H120" stroke="#5d5746" stroke-width="2" opacity="0.7"/>
      <text x="25" y="126" fill="#5d5746" font-family="serif" font-size="14" letter-spacing="4">潮声</text>
    </g>
    <g fill="#efc783" opacity="0.2">
      <circle cx="1210" cy="340" r="1.5"/><circle cx="1290" cy="420" r="1"/><circle cx="1160" cy="470" r="1.2"/>
      <circle cx="760" cy="600" r="1"/><circle cx="1430" cy="520" r="1.2"/>
    </g>
  </svg>`,

  dawn: `
  <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="dn-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#162638"/>
        <stop offset="0.38" stop-color="#455e6d"/>
        <stop offset="0.66" stop-color="#c28a78"/>
        <stop offset="0.82" stop-color="#f0c48e"/>
        <stop offset="1" stop-color="#f5d9ad"/>
      </linearGradient>
      <linearGradient id="dn-sea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#b89272"/>
        <stop offset="0.3" stop-color="#7c7b72"/>
        <stop offset="1" stop-color="#26363c"/>
      </linearGradient>
      <radialGradient id="dn-sun" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#fff2cf" stop-opacity="1"/>
        <stop offset="0.24" stop-color="#f9d69a" stop-opacity="0.8"/>
        <stop offset="1" stop-color="#f0b475" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="dn-reflect" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f5d39b" stop-opacity="0.55"/>
        <stop offset="1" stop-color="#f5d39b" stop-opacity="0"/>
      </linearGradient>
      <filter id="dn-blur"><feGaussianBlur stdDeviation="7"/></filter>
    </defs>
    <rect width="1600" height="900" fill="url(#dn-sky)"/>
    <circle cx="1120" cy="590" r="250" fill="url(#dn-sun)"/>
    <circle cx="1120" cy="590" r="54" fill="#fbe7bd" opacity="0.88"/>
    <g fill="#d9b79b" opacity="0.36">
      <ellipse cx="460" cy="300" rx="290" ry="26"/>
      <ellipse cx="860" cy="380" rx="380" ry="24"/>
      <ellipse cx="1240" cy="280" rx="260" ry="18"/>
    </g>
    <path d="M0 650 C220 636 420 658 620 646 C840 632 1010 660 1210 646 C1380 634 1500 650 1600 640 V900 H0Z" fill="url(#dn-sea)"/>
    <path d="M1040 656 C1090 632 1160 632 1200 656 C1160 676 1090 678 1040 656Z" fill="url(#dn-reflect)" filter="url(#dn-blur)" opacity="0.85"/>
    <g stroke="#f6d9a3" stroke-width="2" opacity="0.38">
      <path d="M1068 690 C1100 678 1140 678 1172 690"/>
      <path d="M1040 720 C1090 704 1150 704 1200 720"/>
      <path d="M1010 762 C1080 740 1160 740 1230 762"/>
      <path d="M970 820 C1060 792 1180 792 1270 820"/>
    </g>
    <g fill="#1c2c31">
      <path d="M1210 900 V650 H1240 V900Z"/>
      <path d="M1178 690 H1280 L1262 704 H1192Z"/>
      <path d="M1190 650 H1260 L1244 624 H1206Z"/>
      <path d="M0 900 V720 C90 700 180 704 260 730 C330 752 390 802 440 900Z"/>
      <path d="M1600 900 V736 C1510 718 1440 728 1380 758 C1340 778 1310 840 1300 900Z"/>
    </g>
    <g stroke="#2c3d42" stroke-width="4" fill="none" opacity="0.9">
      <path d="M230 720 V660 H300 M246 686 H300 M300 660 L340 690"/>
      <path d="M150 760 V690 H210 M160 722 H210"/>
    </g>
    <g stroke="#53676b" stroke-width="1.4" fill="none" opacity="0.65">
      <path d="M520 260 C540 242 570 242 590 260 C570 254 540 254 520 260Z"/>
      <path d="M720 210 C735 196 758 196 773 210 C758 205 735 205 720 210Z"/>
      <path d="M880 300 C898 283 926 283 944 300 C926 294 898 294 880 300Z"/>
    </g>
    <g fill="#263a40" opacity="0.7">
      <path d="M0 900 V840 C120 814 220 820 320 850 C380 868 420 884 440 900Z"/>
      <path d="M1600 900 V850 C1500 824 1420 832 1360 858 C1330 872 1310 886 1300 900Z"/>
    </g>
    <rect x="0" y="0" width="1600" height="900" fill="#f5c792" opacity="0.035"/>
  </svg>`,

  villa: `
  <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="vl-wall" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#261f1b"/>
        <stop offset="0.55" stop-color="#17120f"/>
        <stop offset="1" stop-color="#0b0908"/>
      </linearGradient>
      <linearGradient id="vl-floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#211610"/>
        <stop offset="1" stop-color="#090706"/>
      </linearGradient>
      <linearGradient id="vl-window" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#9d8c7a"/>
        <stop offset="0.45" stop-color="#6b7e80"/>
        <stop offset="0.7" stop-color="#4d6568"/>
        <stop offset="1" stop-color="#293c3f"/>
      </linearGradient>
      <radialGradient id="vl-sun" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#ffe0ab" stop-opacity="0.75"/>
        <stop offset="1" stop-color="#e8b870" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="vl-lamp" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#ffd28c" stop-opacity="0.55"/>
        <stop offset="0.5" stop-color="#c28545" stop-opacity="0.12"/>
        <stop offset="1" stop-color="#c28545" stop-opacity="0"/>
      </radialGradient>
      <filter id="vl-blur"><feGaussianBlur stdDeviation="22"/></filter>
    </defs>
    <rect width="1600" height="900" fill="url(#vl-wall)"/>
    <rect y="650" width="1600" height="250" fill="url(#vl-floor)"/>
    <g>
      <rect x="155" y="80" width="820" height="530" fill="url(#vl-window)"/>
      <rect x="155" y="470" width="820" height="140" fill="#2a3d3f" opacity="0.55"/>
      <circle cx="710" cy="320" r="130" fill="url(#vl-sun)"/>
      <circle cx="710" cy="320" r="36" fill="#f2d7af" opacity="0.72"/>
      <g stroke="#201a16" stroke-width="17">
        <line x1="565" y1="80" x2="565" y2="610"/>
        <line x1="155" y1="345" x2="975" y2="345"/>
      </g>
      <rect x="135" y="60" width="860" height="570" fill="none" stroke="#0b0908" stroke-width="22"/>
      <g opacity="0.32" stroke="#e0cba7" stroke-width="1">
        <path d="M230 125 C360 210 300 360 420 470"/>
        <path d="M860 120 C760 240 900 360 790 500"/>
      </g>
    </g>
    <g fill="#d8ccb9" opacity="0.7">
      <path d="M190 90 C150 180 165 300 130 420 L210 500 C240 380 220 220 250 110Z" opacity="0.2"/>
      <path d="M940 80 C990 190 970 330 1010 470 L920 540 C890 400 910 230 880 100Z" opacity="0.16"/>
    </g>
    <g opacity="0.85">
      <path d="M1070 570 C1060 500 1100 450 1180 440 C1270 430 1350 480 1380 570 L1100 760 L950 760Z" fill="#0a0807"/>
      <path d="M1110 620 C1150 560 1250 545 1320 605 C1350 635 1360 690 1340 760 L1040 760Z" fill="#15100c"/>
      <path d="M1120 650 C1170 612 1270 610 1320 660" fill="none" stroke="#4d3a29" stroke-width="2" opacity="0.6"/>
    </g>
    <g>
      <path d="M1080 590 C1110 555 1160 545 1200 560 L1450 660 C1480 674 1488 698 1470 718 L1220 760 L1040 700 C1020 680 1045 615 1080 590Z" fill="#1a1210" stroke="#0a0706" stroke-width="4"/>
      <rect x="1110" y="610" width="330" height="22" rx="5" fill="#d2c2a8" opacity="0.7"/>
      <g stroke="#d2c2a8" stroke-width="1.2" opacity="0.4">
        <path d="M1140 614 V728 M1180 614 V735 M1220 614 V740 M1260 614 V744 M1300 614 V746 M1340 614 V744"/>
      </g>
      <path d="M1080 690 C1140 710 1320 730 1450 700" fill="none" stroke="#4c3a2c" stroke-width="2" opacity="0.6"/>
      <ellipse cx="1240" cy="760" rx="250" ry="30" fill="#c49558" opacity="0.08" filter="url(#vl-blur)"/>
    </g>
    <g>
      <circle cx="260" cy="260" r="160" fill="url(#vl-lamp)" opacity="0.4"/>
      <path d="M230 220 C260 195 300 198 320 225 L305 260 H245Z" fill="#d4bd94"/>
      <path d="M275 260 V330" stroke="#8d7046" stroke-width="2"/>
      <circle cx="275" cy="340" r="5" fill="#ffd9a0" opacity="0.8"/>
    </g>
    <g opacity="0.8">
      <rect x="80" y="560" width="260" height="18" fill="#241811"/>
      <rect x="100" y="578" width="16" height="160" fill="#0d0a08"/>
      <rect x="300" y="578" width="16" height="160" fill="#0d0a08"/>
      <rect x="116" y="500" width="230" height="70" fill="#1d1512"/>
      <rect x="130" y="520" width="200" height="38" fill="#0e0c0b"/>
      <g transform="translate(180 440) rotate(-3)">
        <rect width="92" height="70" fill="#d8c9b0" opacity="0.55" stroke="#6e5b44"/>
        <rect x="8" y="8" width="76" height="54" fill="#485354"/>
        <path d="M16 54 L38 28 L55 46 L68 32 L76 58 L16 58Z" fill="#1e2726"/>
      </g>
      <g transform="translate(285 455) rotate(4)">
        <rect width="78" height="58" fill="#d8c9b0" opacity="0.45" stroke="#6e5b44"/>
        <rect x="7" y="7" width="64" height="44" fill="#3f4a4b"/>
      </g>
    </g>
    <g>
      <path d="M1460 720 C1450 640 1470 590 1500 540" fill="none" stroke="#0a0b09" stroke-width="6"/>
      <g fill="#11201b">
        <ellipse cx="1468" cy="560" rx="48" ry="16" transform="rotate(-35 1468 560)"/>
        <ellipse cx="1512" cy="596" rx="52" ry="16" transform="rotate(28 1512 596)"/>
        <ellipse cx="1460" cy="626" rx="48" ry="14" transform="rotate(-22 1460 626)"/>
        <ellipse cx="1520" cy="660" rx="44" ry="14" transform="rotate(38 1520 660)"/>
      </g>
      <path d="M1448 720 H1510 L1538 900 H1420Z" fill="#1b1511"/>
    </g>
    <g fill="#e8d8bc" opacity="0.35">
      <circle cx="450" cy="260" r="1.4"/><circle cx="610" cy="180" r="1"/><circle cx="810" cy="470" r="1.2"/>
      <circle cx="1260" cy="380" r="1.1"/><circle cx="1020" cy="580" r="1.3"/>
    </g>
  </svg>`,

  hospital: `
  <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="hp-wall" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#263436"/>
        <stop offset="0.55" stop-color="#182326"/>
        <stop offset="1" stop-color="#0b1114"/>
      </linearGradient>
      <linearGradient id="hp-floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#182426"/>
        <stop offset="1" stop-color="#0a1012"/>
      </linearGradient>
      <linearGradient id="hp-window" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#5e7b80"/>
        <stop offset="0.55" stop-color="#314b50"/>
        <stop offset="1" stop-color="#16272c"/>
      </linearGradient>
      <radialGradient id="hp-light" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#e6f0ea" stop-opacity="0.42"/>
        <stop offset="1" stop-color="#d7e8e3" stop-opacity="0"/>
      </radialGradient>
      <filter id="hp-blur"><feGaussianBlur stdDeviation="20"/></filter>
    </defs>
    <rect width="1600" height="900" fill="url(#hp-wall)"/>
    <rect y="670" width="1600" height="230" fill="url(#hp-floor)"/>
    <g>
      <rect x="860" y="100" width="620" height="480" fill="url(#hp-window)"/>
      <g stroke="#111a1d" stroke-width="15">
        <line x1="1170" y1="100" x2="1170" y2="580"/>
        <line x1="860" y1="330" x2="1480" y2="330"/>
      </g>
      <rect x="840" y="80" width="660" height="520" fill="none" stroke="#0d1518" stroke-width="18"/>
      <g stroke="#c8dadd" stroke-width="1" opacity="0.25">
        <line x1="900" y1="130" x2="880" y2="260"/><line x1="980" y1="160" x2="956" y2="330"/>
        <line x1="1060" y1="120" x2="1038" y2="280"/><line x1="1230" y1="150" x2="1208" y2="320"/>
        <line x1="1320" y1="120" x2="1298" y2="290"/><line x1="1400" y1="170" x2="1378" y2="350"/>
      </g>
      <path d="M840 580 C1000 560 1240 565 1500 580 V630 H840Z" fill="#0b1518" opacity="0.7"/>
    </g>
    <g fill="#d7e3df" opacity="0.65">
      <path d="M40 0 H360 L300 900 H0 V0Z" opacity="0.09"/>
      <path d="M760 0 H840 L800 900 H730Z" opacity="0.06"/>
    </g>
    <g>
      <path d="M120 360 H560 V690 H120Z" fill="#1a2425" stroke="#0b1113"/>
      <path d="M120 360 H560 L610 690 H90Z" fill="#263334"/>
      <rect x="150" y="400" width="360" height="170" fill="#0d1517"/>
      <g fill="#516669" opacity="0.55">
        <rect x="180" y="430" width="120" height="10"/>
        <rect x="180" y="458" width="86" height="7"/>
        <rect x="180" y="480" width="150" height="7"/>
        <rect x="180" y="502" width="105" height="7"/>
      </g>
      <circle cx="465" cy="445" r="24" fill="#d7e4dd" opacity="0.25"/>
      <path d="M465 430 V460 M450 445 H480" stroke="#d7e4dd" stroke-width="3" opacity="0.35"/>
      <path d="M80 690 H620" stroke="#3c4d4f" stroke-width="3"/>
    </g>
    <g>
      <path d="M1140 610 C1180 560 1260 552 1310 590 C1340 614 1348 654 1334 690 L1190 690 L1120 660Z" fill="#162022"/>
      <path d="M1160 620 C1200 585 1258 584 1296 615" fill="none" stroke="#4f6365" stroke-width="2" opacity="0.6"/>
      <rect x="1150" y="654" width="210" height="20" rx="8" fill="#263335"/>
    </g>
    <g>
      <circle cx="780" cy="280" r="180" fill="url(#hp-light)" opacity="0.55"/>
      <rect x="700" y="220" width="160" height="26" fill="#d8e5df" opacity="0.28"/>
      <path d="M735 246 V690 M825 246 V690" stroke="#d8e5df" stroke-width="2" opacity="0.12"/>
    </g>
    <g opacity="0.8">
      <rect x="1330" y="610" width="160" height="18" fill="#263234"/>
      <rect x="1348" y="628" width="12" height="120" fill="#11191b"/>
      <rect x="1460" y="628" width="12" height="120" fill="#11191b"/>
      <path d="M1370 584 C1390 550 1420 550 1440 584" fill="none" stroke="#2b393b" stroke-width="2"/>
      <path d="M1394 610 C1394 568 1418 550 1444 548" fill="none" stroke="#1b2729" stroke-width="2"/>
      <g fill="#1e2f29">
        <ellipse cx="1398" cy="568" rx="24" ry="8" transform="rotate(-30 1398 568)"/>
        <ellipse cx="1430" cy="582" rx="26" ry="8" transform="rotate(24 1430 582)"/>
      </g>
    </g>
    <g fill="#d8e4df" opacity="0.25">
      <circle cx="560" cy="260" r="1.2"/><circle cx="690" cy="160" r="1"/><circle cx="1060" cy="610" r="1.3"/>
      <circle cx="370" cy="580" r="1"/><circle cx="1330" cy="290" r="1.2"/>
    </g>
  </svg>`,

  concert: `
  <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ct-bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#070b12"/>
        <stop offset="0.55" stop-color="#0c111a"/>
        <stop offset="1" stop-color="#05070a"/>
      </linearGradient>
      <linearGradient id="ct-curtain" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#24141a"/>
        <stop offset="0.5" stop-color="#120b0f"/>
        <stop offset="1" stop-color="#08070a"/>
      </linearGradient>
      <radialGradient id="ct-light" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#f3dba8" stop-opacity="0.55"/>
        <stop offset="0.5" stop-color="#c49a5f" stop-opacity="0.12"/>
        <stop offset="1" stop-color="#c49a5f" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="ct-stage" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2d2218"/>
        <stop offset="1" stop-color="#0a0b0c"/>
      </linearGradient>
      <filter id="ct-blur"><feGaussianBlur stdDeviation="22"/></filter>
    </defs>
    <rect width="1600" height="900" fill="url(#ct-bg)"/>
    <g fill="url(#ct-curtain)" opacity="0.95">
      <path d="M0 0 H360 C330 130 310 300 300 450 C290 620 320 760 350 900 H0Z"/>
      <path d="M1600 0 H1240 C1270 130 1290 300 1300 450 C1310 620 1280 760 1250 900 H1600Z"/>
    </g>
    <path d="M340 870 V330 C340 190 540 110 800 110 C1060 110 1260 190 1260 330 V870" fill="none" stroke="#8f7147" stroke-width="2" opacity="0.5"/>
    <path d="M800 0 V120" stroke="#594932" stroke-width="2"/>
    <circle cx="800" cy="210" r="130" fill="url(#ct-light)" opacity="0.45"/>
    <path d="M800 620 C1030 620 1220 690 1330 800 H270 C380 690 570 620 800 620Z" fill="url(#ct-stage)"/>
    <g opacity="0.8">
      <path d="M470 720 C530 660 640 630 760 630 H900 C1030 630 1140 665 1190 720 L1240 900 H410Z" fill="#080a0d"/>
      <g transform="translate(560 490)">
        <path d="M0 0 C90 -20 190 0 270 55 L330 160 C280 185 160 185 50 140 L-20 70Z" fill="#0b0c10" stroke="#8b6b43" stroke-width="2"/>
        <path d="M25 10 C140 -10 250 15 315 70 L300 95 C220 50 110 30 10 40Z" fill="#17181d" stroke="#b28a56" stroke-width="1.2"/>
        <rect x="20" y="110" width="290" height="26" rx="4" fill="#d8c9ae" opacity="0.55"/>
        <g stroke="#22252a" stroke-width="1">
          <path d="M35 110 V136 M55 110 V136 M75 110 V136 M95 110 V136 M115 110 V136 M135 110 V136 M155 110 V136 M175 110 V136 M195 110 V136 M215 110 V136 M235 110 V136 M255 110 V136 M275 110 V136 M295 110 V136"/>
        </g>
        <path d="M70 136 L50 360 M265 136 L285 360" stroke="#0a0b0d" stroke-width="8"/>
        <path d="M175 136 V330" stroke="#0a0b0d" stroke-width="6"/>
        <path d="M0 0 C90 -20 190 0 270 55" fill="none" stroke="#a27b4e" stroke-width="1.5" opacity="0.7"/>
      </g>
      <path d="M520 760 C680 730 920 730 1080 760" fill="none" stroke="#33281d" stroke-width="2" opacity="0.5"/>
    </g>
    <g fill="#06080a">
      <path d="M0 900 V790 C140 750 300 738 460 748 C520 726 580 726 620 748 C700 730 780 738 820 760 C900 744 980 752 1020 776 C1100 760 1200 764 1280 790 C1380 774 1500 786 1600 810 V900Z"/>
      <circle cx="260" cy="748" r="24"/><circle cx="540" cy="720" r="22"/><circle cx="820" cy="732" r="22"/><circle cx="1090" cy="728" r="22"/><circle cx="1380" cy="756" r="24"/>
    </g>
    <g fill="#d8c399" opacity="0.25">
      <circle cx="700" cy="320" r="1.2"/><circle cx="920" cy="280" r="1"/><circle cx="1080" cy="440" r="1.1"/>
      <circle cx="460" cy="400" r="1"/><circle cx="1240" cy="320" r="1.3"/>
    </g>
  </svg>`,

  gallery: `
  <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gl-wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1b1d1d"/>
        <stop offset="0.65" stop-color="#111314"/>
        <stop offset="1" stop-color="#08090a"/>
      </linearGradient>
      <linearGradient id="gl-floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#191b1b"/>
        <stop offset="1" stop-color="#070808"/>
      </linearGradient>
      <linearGradient id="gl-photo" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#8f9290"/>
        <stop offset="0.5" stop-color="#444b4b"/>
        <stop offset="1" stop-color="#171d1e"/>
      </linearGradient>
      <radialGradient id="gl-spot" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#f4dfb2" stop-opacity="0.35"/>
        <stop offset="0.45" stop-color="#ccb17c" stop-opacity="0.09"/>
        <stop offset="1" stop-color="#ccb17c" stop-opacity="0"/>
      </radialGradient>
      <filter id="gl-blur"><feGaussianBlur stdDeviation="20"/></filter>
    </defs>
    <rect width="1600" height="900" fill="url(#gl-wall)"/>
    <rect y="690" width="1600" height="210" fill="url(#gl-floor)"/>
    <g opacity="0.6" stroke="#77746a" stroke-width="1">
      <path d="M0 690 H1600"/>
      <path d="M0 710 H1600"/>
    </g>
    <g>
      <circle cx="420" cy="260" r="250" fill="url(#gl-spot)"/>
      <circle cx="800" cy="230" r="280" fill="url(#gl-spot)"/>
      <circle cx="1180" cy="260" r="250" fill="url(#gl-spot)"/>
    </g>
    <g>
      <rect x="250" y="150" width="330" height="420" fill="#0b0c0c" stroke="#5f5b50" stroke-width="2"/>
      <rect x="270" y="170" width="290" height="380" fill="url(#gl-photo)"/>
      <path d="M270 470 L370 350 L450 430 L520 340 L560 380 V550 H270Z" fill="#1a2222" opacity="0.8"/>
      <circle cx="470" cy="245" r="32" fill="#c2c6bd" opacity="0.45"/>
      <rect x="640" y="110" width="320" height="500" fill="#0b0c0c" stroke="#5f5b50" stroke-width="2"/>
      <rect x="660" y="130" width="280" height="460" fill="#2a3233"/>
      <path d="M660 520 C730 450 800 440 860 480 C900 505 920 545 940 590 H660Z" fill="#0d171a"/>
      <circle cx="800" cy="270" r="95" fill="#d9ddcf" opacity="0.16"/>
      <path d="M745 330 C760 290 800 270 835 295 C860 315 865 360 850 405 C830 450 790 460 765 435 C742 412 735 370 745 330Z" fill="#6d7773" opacity="0.28"/>
      <rect x="1020" y="160" width="330" height="400" fill="#0b0c0c" stroke="#5f5b50" stroke-width="2"/>
      <rect x="1040" y="180" width="290" height="360" fill="url(#gl-photo)"/>
      <path d="M1040 470 L1120 370 L1190 430 L1260 330 L1330 390 V540 H1040Z" fill="#1b2525" opacity="0.75"/>
      <circle cx="1240" cy="250" r="26" fill="#d6d8cd" opacity="0.3"/>
    </g>
    <g>
      <rect x="400" y="650" width="800" height="24" fill="#0c0d0d"/>
      <rect x="430" y="674" width="26" height="180" fill="#060707"/>
      <rect x="1144" y="674" width="26" height="180" fill="#060707"/>
      <path d="M460 610 H1140" stroke="#39382f" stroke-width="2" opacity="0.5"/>
      <path d="M470 610 C650 590 950 590 1130 610" fill="none" stroke="#c8b58c" stroke-width="1" opacity="0.18"/>
    </g>
    <g opacity="0.4">
      <path d="M60 720 L400 720 L360 900 H0Z" fill="#141817"/>
      <path d="M1200 720 L1540 720 L1600 900 H1160Z" fill="#141817"/>
    </g>
    <g fill="#e8d6b0" opacity="0.24">
      <circle cx="300" cy="280" r="1.2"/><circle cx="680" cy="340" r="1"/><circle cx="1100" cy="300" r="1.1"/>
      <circle cx="1400" cy="420" r="1"/><circle cx="860" cy="620" r="1.2"/>
    </g>
  </svg>`,

  beach: `
  <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bc-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#263c52"/>
        <stop offset="0.35" stop-color="#6a7980"/>
        <stop offset="0.62" stop-color="#d38f76"/>
        <stop offset="0.82" stop-color="#edc08e"/>
        <stop offset="1" stop-color="#f4d7ad"/>
      </linearGradient>
      <linearGradient id="bc-sea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#b08675"/>
        <stop offset="0.3" stop-color="#6c7a7a"/>
        <stop offset="1" stop-color="#243b42"/>
      </linearGradient>
      <radialGradient id="bc-sun" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#fff1ce" stop-opacity="1"/>
        <stop offset="0.22" stop-color="#fbd69a" stop-opacity="0.75"/>
        <stop offset="1" stop-color="#f0b475" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="bc-reflect" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f4d4a4" stop-opacity="0.5"/>
        <stop offset="1" stop-color="#f4d4a4" stop-opacity="0"/>
      </linearGradient>
      <filter id="bc-blur"><feGaussianBlur stdDeviation="8"/></filter>
    </defs>
    <rect width="1600" height="900" fill="url(#bc-sky)"/>
    <circle cx="1130" cy="560" r="230" fill="url(#bc-sun)"/>
    <circle cx="1130" cy="560" r="54" fill="#fbe5b8" opacity="0.9"/>
    <g fill="#d7ab91" opacity="0.33">
      <ellipse cx="470" cy="300" rx="300" ry="24"/>
      <ellipse cx="860" cy="380" rx="380" ry="22"/>
      <ellipse cx="1280" cy="270" rx="240" ry="16"/>
    </g>
    <path d="M0 610 C260 590 420 620 620 604 C840 586 1040 620 1240 602 C1410 588 1510 604 1600 596 V900 H0Z" fill="url(#bc-sea)"/>
    <path d="M1040 620 C1090 596 1160 596 1200 620 C1160 644 1090 646 1040 620Z" fill="url(#bc-reflect)" filter="url(#bc-blur)" opacity="0.9"/>
    <g stroke="#f6d9a3" stroke-width="2" opacity="0.35">
      <path d="M1070 660 C1110 646 1150 646 1190 660"/>
      <path d="M1030 700 C1090 680 1180 680 1240 700"/>
      <path d="M990 760 C1080 735 1200 735 1290 760"/>
      <path d="M940 830 C1060 800 1200 800 1320 830"/>
    </g>
    <path d="M0 900 V760 C160 720 340 740 520 780 C720 824 900 850 1080 866 C1260 882 1420 862 1600 820 V900Z" fill="#a78b70" opacity="0.55"/>
    <path d="M0 900 V820 C180 790 380 812 580 840 C800 872 1000 882 1200 886 C1360 890 1500 872 1600 850 V900Z" fill="#3b3934" opacity="0.45"/>
    <g>
      <path d="M0 900 V740 C90 720 170 730 240 760 L310 900Z" fill="#14191a"/>
      <path d="M1600 900 V720 C1500 700 1420 720 1360 760 L1290 900Z" fill="#121719"/>
      <g stroke="#1b2527" stroke-width="4" fill="none" opacity="0.8">
        <path d="M1240 900 L1450 760 H1520"/>
        <path d="M1380 772 V900 M1450 760 V900"/>
        <path d="M360 900 L250 790 H190"/>
      </g>
      <g fill="#e9c27f" opacity="0.45">
        <circle cx="1510" cy="742" r="4"/><circle cx="1435" cy="786" r="3"/><circle cx="1340" cy="848" r="3"/>
      </g>
    </g>
    <g fill="#f1d6a4" opacity="0.45">
      <circle cx="240" cy="650" r="1.4"/><circle cx="560" cy="690" r="1"/><circle cx="880" cy="640" r="1.2"/>
      <circle cx="1280" cy="700" r="1.3"/><circle cx="980" cy="830" r="1"/>
    </g>
    <g stroke="#4d5d5f" stroke-width="1.4" fill="none" opacity="0.55">
      <path d="M520 280 C540 262 570 262 590 280 C570 274 540 274 520 280Z"/>
      <path d="M740 230 C755 216 778 216 793 230 C778 225 755 225 740 230Z"/>
      <path d="M920 310 C938 293 966 293 984 310 C966 304 938 304 920 310Z"/>
    </g>
  </svg>`
};


/* ------------------------------------------------------------------ */
/* 人物剪影                                                            */
/* ------------------------------------------------------------------ */
