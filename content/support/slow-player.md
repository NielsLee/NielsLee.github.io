---
title: '变速播放器使用说明与技术支持'
date: 2026-10-07T00:00:00+08:00
lastmod: 2026-10-07T00:00:00+08:00
draft: false
url: '/links/slow-player/support/'
comments: false
toc: true
---

语言 / Language： [简体中文](#zh-hans) · [English (US)](#en) · [Deutsch](#de) · [Français](#fr) · [繁體中文](#zh-hant) · [한국어](#ko) · [日本語](#ja)

## 使用说明（简体中文） {#zh-hans}

变速播放器（Variable-speed player，项目名 slow-player）是一款适用于 iOS 17 及更新版本的 iPhone 视频播放器，可长按画面变速播放，并将刚才的变速片段保存为视频或 Live Photo。

### 1. 访问视频

首次启动时，请按提示允许“完全访问”照片库。如果此前选择了有限访问或拒绝访问，请前往 iOS「设置」中的变速播放器照片权限页面调整授权。

「时间线」按拍摄日期展示视频，「收藏」展示系统照片库中已收藏的视频。点击缩略图即可播放。云朵标识表示视频尚需从 iCloud 下载，请保持网络可用并等待加载。

### 2. 长按变速

播放时在画面上长按约 0.35 秒，按所在区域切换速度；默认左上 20%、左下 40%、右上 60%、右下 80%。松开手指后恢复正常播放。

在「设置」的「长按区域」中点击方格，可将对应速度调整为 1%–400%。100% 为正常速度，低于 100% 为慢放，高于 100% 为快放。

轻点画面显示或隐藏进度控件；双指捏合可缩放至 1–6 倍，双指拖动可移动放大后的画面。单指向下拖动并超过返回阈值后松手，即可退出播放。

### 3. 预览与保存片段

完成一次有效的长按变速并松手后，右上角会出现片段控件。点击中间的缩略图预览，点击左侧按钮保存为 Live Photo，点击右侧按钮保存为视频。片段沿用该次长按时的速度、补帧及音调设置。再次长按变速会替换当前待保存片段。

导出会生成新的照片库项目，不覆盖原视频。请等待处理和保存完成，再在系统「照片」中查看结果。

### 4. 免费版与 Pro

免费版中，每个原始视频最多成功导出一次，视频和 Live Photo 共用这一次额度；失败或取消不扣次数。重新打开同一视频或录制新的变速片段不会重置额度。

Pro 为一次性购买，可解除导出次数限制，并启用「平滑慢放」、24–60 fps 目标帧率调节和「保持音调」。实际价格以 App Store 购买页面显示为准。在「设置」中选择「解锁 Pro」购买；已经购买的用户可使用「恢复购买」，并确认登录的是购买时使用的 Apple 账户。购买或恢复可能需要网络连接。

平滑慢放可改善低速播放的连贯性，快速运动时可能出现重影，实际效果受视频和设备性能影响。保持音调默认关闭；开启后可减少变速造成的音调变化，极低速度下仍可能有音色变化，部分不稳定音频片段会降低音量或回退自然变调以减少失真。

### 5. 管理视频

长按列表中的缩略图可收藏、取消收藏或删除；点击「选择」可批量操作。收藏与删除会同步反映到系统照片库，删除前请核对所选项目。

### 常见问题

- **看不到视频**：检查是否授予照片库完全访问权限，以及照片库中是否有视频。
- **iCloud 视频无法播放**：检查网络及 iCloud 照片状态，尝试在系统「照片」中先打开该视频，再返回应用。
- **无法保存片段**：检查照片权限、设备剩余空间及免费导出额度；等待视频下载和处理完成后重试。
- **Pro 未解锁**：使用「恢复购买」，检查 Apple 账户和网络；待批准的购买需等待批准完成。

### 技术支持

如遇到问题或有建议，请联系：

[niels_fengfeng@gmail.com](mailto:niels_fengfeng@gmail.com)

建议在邮件中说明设备型号、iOS 版本、应用版本、复现步骤及错误提示。无需提供私人视频或完整照片库；如需附图，请遮盖个人信息。

[隐私政策](/links/slow-player/privacy/#zh-hans)

---

## User Guide (English — United States) {#en}

Variable-speed player (project name: slow-player) is an iPhone video player for iOS 17 or later. Hold the video to change playback speed, then save that segment as a video or Live Photo.

### 1. Open a Video

Grant Full Access to Photos when prompted. If you previously chose Limited Access or denied access, change the app's photo permission in iOS Settings.

Timeline displays videos by creation date; Favorites displays videos marked as favorites in the system photo library. Tap a thumbnail to play. A cloud icon means the video still needs to download from iCloud; keep an internet connection available and wait for loading to finish.

### 2. Hold to Change Speed

Hold the video for about 0.35 seconds to use the speed assigned to that region. Defaults are 20% at top left, 40% at bottom left, 60% at top right, and 80% at bottom right. Release to resume normal playback.

In Settings, tap a Hold Region to set its speed from 1% to 400%. 100% is normal speed; lower values slow down playback and higher values speed it up.

Tap the picture to show or hide playback controls. Pinch with two fingers to zoom from 1× to 6× and drag with two fingers to pan. Drag downward with one finger far enough and release to leave the player.

### 3. Preview and Save

After a valid variable-speed hold, release to show the clip controls at the top right. Tap the middle thumbnail to preview, the left button to save a Live Photo, or the right button to save a video. The clip uses the speed, interpolation, and pitch settings from that hold. Another hold replaces the pending clip.

Exports create new photo-library items without overwriting the source video. Wait for processing and saving to finish, then find the result in Photos.

### 4. Free Version and Pro

The free version allows one successful export per original video, shared between video and Live Photo formats. Failed or canceled exports do not consume the allowance. Reopening the same source or making a new segment does not reset it.

Pro is a one-time purchase that removes the export limit and enables Smooth Slow Motion, a target frame rate of 24–60 fps, and Preserve Pitch. The price shown by the App Store applies. Choose Unlock Pro in Settings to purchase, or Restore Purchases if you already own Pro. Use the Apple Account used for the original purchase. Purchasing or restoring may require internet access.

Smooth Slow Motion can improve low-speed playback but may produce ghosting during fast movement; results depend on the video and device. Preserve Pitch is off by default. When enabled, it reduces pitch changes, although very low speeds can still alter the sound. Some unstable audio clips may be quieter or fall back to natural pitch changes to reduce distortion.

### 5. Manage Videos

Hold a library thumbnail to favorite, unfavorite, or delete it. Tap Select for bulk actions. These changes also affect the system photo library; review selected items before confirming deletion.

### Troubleshooting

- **No videos appear**: check Full Access permission and whether your photo library contains videos.
- **An iCloud video will not play**: check your connection and iCloud Photos status; try opening it in Photos first.
- **A clip will not save**: check photo permission, available storage, and your free export allowance. Wait for downloading and processing to finish before retrying.
- **Pro is not unlocked**: restore purchases and check your Apple Account and connection. Pending purchases require approval first.

### Technical Support

For problems, feedback, or suggestions, email:

[niels_fengfeng@gmail.com](mailto:niels_fengfeng@gmail.com)

Include your device model, iOS version, app version, steps to reproduce, and any error message. You do not need to send private videos or your entire library. Hide personal information in any screenshots you choose to attach.

[Privacy Policy](/links/slow-player/privacy/#en)

---

## Bedienungsanleitung (Deutsch) {#de}

Variable-speed player (Projektname: slow-player) ist ein iPhone-Videoplayer für iOS 17 oder neuer. Halten Sie das Videobild gedrückt, um die Geschwindigkeit zu ändern, und speichern Sie den Abschnitt anschließend als Video oder Live Photo.

### 1. Video öffnen

Erlauben Sie beim ersten Start vollständigen Zugriff auf Fotos. Wenn Sie zuvor eingeschränkten Zugriff gewählt oder den Zugriff verweigert haben, ändern Sie die Fotoberechtigung der App in den iOS-Einstellungen.

Die Zeitleiste zeigt Videos nach Aufnahmedatum, die Favoritenansicht die in der systemeigenen Fotomediathek als Favoriten markierten Videos. Tippen Sie zum Abspielen auf ein Vorschaubild. Ein Wolkensymbol bedeutet, dass das Video noch aus iCloud heruntergeladen werden muss; halten Sie eine Internetverbindung bereit und warten Sie auf den Abschluss.

### 2. Geschwindigkeit durch Gedrückthalten ändern

Halten Sie das Bild etwa 0,35 Sekunden gedrückt, um die Geschwindigkeit des jeweiligen Bereichs zu verwenden. Standardwerte: oben links 20 %, unten links 40 %, oben rechts 60 %, unten rechts 80 %. Beim Loslassen wird mit normaler Geschwindigkeit weitergespielt.

Tippen Sie in den Einstellungen auf ein Feld der Langdruckbereiche, um dessen Geschwindigkeit auf 1 %–400 % einzustellen. 100 % ist Normalgeschwindigkeit, niedrigere Werte verlangsamen und höhere beschleunigen die Wiedergabe.

Tippen Sie auf das Bild, um die Wiedergabesteuerung ein- oder auszublenden. Mit zwei Fingern können Sie auf 1×–6× zoomen und das vergrößerte Bild verschieben. Ziehen Sie mit einem Finger weit genug nach unten und lassen Sie los, um den Player zu verlassen.

### 3. Vorschau und Speichern

Nach einem gültigen Abschnitt mit veränderter Geschwindigkeit erscheinen beim Loslassen oben rechts die Clip-Steuerelemente. Das mittlere Vorschaubild öffnet die Vorschau, die linke Schaltfläche speichert ein Live Photo, die rechte ein Video. Der Clip übernimmt Geschwindigkeit, Zwischenbild- und Tonhöheneinstellungen dieses Abschnitts. Erneutes Gedrückthalten ersetzt den noch nicht gespeicherten Abschnitt.

Der Export erstellt neue Einträge in der Fotomediathek und überschreibt das Original nicht. Warten Sie, bis Verarbeitung und Speicherung abgeschlossen sind, und prüfen Sie das Ergebnis in Fotos.

### 4. Kostenlose Version und Pro

In der kostenlosen Version ist je Originalvideo ein erfolgreicher Export möglich; Video und Live Photo teilen sich dieses Kontingent. Fehlgeschlagene oder abgebrochene Exporte verbrauchen es nicht. Das erneute Öffnen desselben Videos oder Erstellen eines neuen Abschnitts setzt es nicht zurück.

Pro ist ein einmaliger Kauf, der die Exportbegrenzung aufhebt und flüssige Zeitlupe, eine Zielbildrate von 24–60 fps und die Beibehaltung der Tonhöhe freischaltet. Es gilt der im App Store angezeigte Preis. Wählen Sie in den Einstellungen die Pro-Freischaltung oder, wenn Sie Pro bereits gekauft haben, die Wiederherstellung von Käufen. Verwenden Sie den Apple Account des ursprünglichen Kaufs. Kauf und Wiederherstellung können eine Internetverbindung erfordern.

Flüssige Zeitlupe kann die Wiedergabe bei niedriger Geschwindigkeit verbessern, bei schnellen Bewegungen jedoch Doppelbilder erzeugen. Das Ergebnis hängt vom Video und Gerät ab. Die Beibehaltung der Tonhöhe ist standardmäßig ausgeschaltet. Sie reduziert Tonhöhenänderungen, kann bei sehr niedrigen Geschwindigkeiten aber weiterhin den Klang verändern. Bei instabilen Audioclips kann die Lautstärke reduziert oder auf natürliche Tonhöhenänderungen zurückgegriffen werden, um Verzerrungen zu verringern.

### 5. Videos verwalten

Halten Sie ein Vorschaubild in der Liste gedrückt, um ein Video als Favorit zu markieren, die Markierung zu entfernen oder es zu löschen. Über die Auswahlfunktion können Sie mehrere Videos bearbeiten. Änderungen wirken sich auch auf die systemeigene Fotomediathek aus; prüfen Sie die Auswahl vor dem Bestätigen einer Löschung.

### Häufige Probleme

- **Keine Videos sichtbar**: Prüfen Sie den vollständigen Fotozugriff und ob die Mediathek Videos enthält.
- **iCloud-Video lässt sich nicht abspielen**: Prüfen Sie die Verbindung und iCloud-Fotos; öffnen Sie das Video zuerst in Fotos.
- **Clip lässt sich nicht speichern**: Prüfen Sie Fotoberechtigung, freien Speicher und kostenloses Exportkontingent. Warten Sie auf Download und Verarbeitung, bevor Sie es erneut versuchen.
- **Pro ist nicht freigeschaltet**: Stellen Sie Käufe wieder her und prüfen Sie Apple Account und Verbindung. Ausstehende Käufe benötigen zunächst eine Genehmigung.

### Technischer Support

Bei Problemen, Rückmeldungen oder Vorschlägen schreiben Sie an:

[niels_fengfeng@gmail.com](mailto:niels_fengfeng@gmail.com)

Nennen Sie Gerätemodell, iOS-Version, App-Version, Schritte zur Reproduktion und Fehlermeldungen. Private Videos oder die gesamte Mediathek sind nicht erforderlich. Verdecken Sie persönliche Informationen auf beigefügten Bildschirmfotos.

[Datenschutzerklärung](/links/slow-player/privacy/#de)

---

## Guide d’utilisation (Français) {#fr}

Variable-speed player (nom du projet : slow-player) est un lecteur vidéo pour iPhone sous iOS 17 ou version ultérieure. Maintenez le doigt sur la vidéo pour changer sa vitesse, puis enregistrez le passage comme vidéo ou Live Photo.

### 1. Ouvrir une vidéo

Autorisez l’accès complet à Photos au premier lancement. Si vous avez choisi un accès limité ou refusé l’accès, modifiez l’autorisation Photos de l’application dans les réglages iOS.

La chronologie présente les vidéos par date de prise de vue ; les favoris affichent les vidéos marquées comme favorites dans la photothèque système. Touchez une vignette pour lire une vidéo. Une icône de nuage indique qu’elle doit encore être téléchargée depuis iCloud ; gardez une connexion Internet disponible et attendez la fin du chargement.

### 2. Maintenir pour changer la vitesse

Maintenez le doigt sur l’image pendant environ 0,35 seconde pour appliquer la vitesse de la zone touchée. Valeurs par défaut : 20 % en haut à gauche, 40 % en bas à gauche, 60 % en haut à droite et 80 % en bas à droite. Relâchez pour reprendre la vitesse normale.

Dans les réglages, touchez une case des zones d’appui prolongé pour définir sa vitesse entre 1 % et 400 %. 100 % correspond à la vitesse normale ; une valeur inférieure ralentit la lecture et une valeur supérieure l’accélère.

Touchez l’image pour afficher ou masquer les commandes. Pincez avec deux doigts pour zoomer de 1× à 6× et faites glisser deux doigts pour déplacer l’image agrandie. Faites glisser un doigt suffisamment vers le bas, puis relâchez pour quitter le lecteur.

### 3. Aperçu et enregistrement

Après un appui prolongé produisant un passage valide à vitesse variable, relâchez pour afficher les commandes de l’extrait en haut à droite. La vignette centrale ouvre l’aperçu, le bouton de gauche enregistre une Live Photo et celui de droite une vidéo. L’extrait utilise la vitesse, l’interpolation et les réglages de hauteur du son de cet appui. Un nouvel appui prolongé remplace l’extrait en attente.

L’exportation crée de nouveaux éléments dans la photothèque sans écraser la vidéo source. Attendez la fin du traitement et de l’enregistrement, puis consultez le résultat dans Photos.

### 4. Version gratuite et Pro

La version gratuite autorise une seule exportation réussie par vidéo originale, commune aux formats vidéo et Live Photo. Les échecs et annulations ne consomment pas le quota. Rouvrir la même vidéo ou créer un autre passage ne réinitialise pas ce quota.

Pro est un achat unique qui supprime la limite d’exportation et active le ralenti fluide, une fréquence cible de 24–60 images/s et la conservation de la hauteur du son. Le prix affiché par l’App Store s’applique. Choisissez le déverrouillage de Pro dans les réglages, ou la restauration des achats si vous possédez déjà Pro. Utilisez le compte Apple de l’achat initial. L’achat et la restauration peuvent nécessiter Internet.

Le ralenti fluide améliore la continuité à faible vitesse, mais peut créer des images fantômes lors de mouvements rapides ; le résultat dépend de la vidéo et de l’appareil. La conservation de la hauteur du son est désactivée par défaut. Elle réduit les variations de hauteur, mais un changement de timbre reste possible à très faible vitesse. Certains extraits audio instables peuvent être moins forts ou revenir à une variation naturelle de hauteur pour réduire la distorsion.

### 5. Gérer les vidéos

Maintenez une vignette de la liste pour ajouter ou retirer un favori, ou supprimer la vidéo. Utilisez la sélection pour les actions groupées. Ces modifications affectent aussi la photothèque système ; vérifiez les éléments avant de confirmer une suppression.

### Dépannage

- **Aucune vidéo n’apparaît** : vérifiez l’accès complet à Photos et la présence de vidéos dans la photothèque.
- **Une vidéo iCloud ne se lit pas** : vérifiez la connexion et Photos iCloud ; essayez de l’ouvrir d’abord dans Photos.
- **Un extrait ne s’enregistre pas** : vérifiez les autorisations Photos, l’espace libre et le quota gratuit. Attendez la fin du téléchargement et du traitement avant de réessayer.
- **Pro n’est pas déverrouillé** : restaurez les achats et vérifiez votre compte Apple et la connexion. Un achat en attente doit d’abord être approuvé.

### Assistance technique

Pour signaler un problème, donner votre avis ou proposer une amélioration :

[niels_fengfeng@gmail.com](mailto:niels_fengfeng@gmail.com)

Indiquez le modèle de l’appareil, les versions d’iOS et de l’application, les étapes pour reproduire le problème et tout message d’erreur. Il n’est pas nécessaire d’envoyer des vidéos privées ou toute votre photothèque. Masquez les informations personnelles dans les captures d’écran jointes.

[Politique de confidentialité](/links/slow-player/privacy/#fr)

---

## 使用說明（繁體中文） {#zh-hant}

變速播放器（Variable-speed player，專案名稱 slow-player）是適用於 iOS 17 及更新版本的 iPhone 影片播放器。長按畫面可變速播放，並將該片段儲存為影片或 Live Photo。

### 1. 開啟影片

首次啟動時，請允許完整存取照片圖庫。若先前選擇有限存取或拒絕授權，請前往 iOS 設定調整本應用程式的照片權限。

時間軸依拍攝日期顯示影片；喜好項目頁顯示系統照片圖庫中已加入喜好項目的影片。點一下縮圖即可播放。雲朵圖示表示影片仍需從 iCloud 下載，請保持網路連線並等待載入完成。

### 2. 長按變速

播放時長按畫面約 0.35 秒，使用該區域的播放速度。預設左上 20%、左下 40%、右上 60%、右下 80%；放開手指後恢復正常播放。

在設定的長按區域中點選方格，可將速度調整為 1%–400%。100% 為正常速度，低於 100% 為慢放，高於 100% 為快放。

點一下畫面可顯示或隱藏播放控制項；雙指捏合可縮放至 1–6 倍，雙指拖曳可移動放大後的畫面。單指向下拖曳超過返回門檻後放開，即可離開播放器。

### 3. 預覽與儲存片段

完成有效的長按變速並放開後，右上角會顯示片段控制項。點選中間縮圖預覽，左側按鈕儲存為 Live Photo，右側按鈕儲存為影片。片段沿用該次長按的速度、補幀及音高設定。再次長按會取代目前待儲存的片段。

匯出會建立新的照片圖庫項目，不會覆寫原始影片。請等待處理及儲存完成，再到系統「照片」查看結果。

### 4. 免費版與 Pro

免費版中，每部原始影片最多成功匯出一次，影片與 Live Photo 共用此額度；失敗或取消不扣次數。重新開啟同一影片或建立新片段不會重設額度。

Pro 為一次性購買，可解除匯出次數限制，並啟用平滑慢放、24–60 fps 目標影格率調整與保持音高。實際價格以 App Store 顯示為準。在設定中選擇解鎖 Pro 購買；已購買者可使用回復購買，並確認使用原購買時的 Apple 帳號。購買或回復可能需要網路連線。

平滑慢放能改善低速播放的連貫性，但快速運動可能出現殘影，效果取決於影片與裝置。保持音高預設關閉，啟用後可減少變速造成的音高變化；極低速度仍可能改變音色。部分不穩定音訊片段可能降低音量或改用自然變調，以減少失真。

### 5. 管理影片

長按列表縮圖可加入或移除喜好項目，或刪除影片；使用選取功能可批次操作。操作也會修改系統照片圖庫，確認刪除前請核對所選項目。

### 常見問題

- **沒有顯示影片**：檢查照片圖庫完整存取權限及圖庫是否有影片。
- **iCloud 影片無法播放**：檢查網路與 iCloud 照片狀態，先在系統「照片」開啟影片後再試。
- **無法儲存片段**：檢查照片權限、剩餘空間與免費匯出額度；等待下載和處理完成後再試。
- **Pro 尚未解鎖**：回復購買並檢查 Apple 帳號與網路。待核准的購買需先完成核准。

### 技術支援

如遇問題或有建議，請寄信至：

[niels_fengfeng@gmail.com](mailto:niels_fengfeng@gmail.com)

請提供裝置型號、iOS 版本、應用程式版本、重現步驟及錯誤訊息。無需提供私人影片或完整照片圖庫；附上螢幕截圖時請遮蔽個人資訊。

[隱私政策](/links/slow-player/privacy/#zh-hant)

---

## 사용 설명 (한국어) {#ko}

Variable-speed player(프로젝트 이름: slow-player)는 iOS 17 이상에서 사용하는 iPhone 동영상 플레이어입니다. 화면을 길게 눌러 재생 속도를 바꾸고 해당 구간을 동영상 또는 Live Photo로 저장할 수 있습니다.

### 1. 동영상 열기

처음 실행할 때 사진 보관함의 전체 접근을 허용해 주세요. 이전에 제한된 접근을 선택하거나 접근을 거부했다면 iOS 설정에서 앱의 사진 권한을 변경하세요.

타임라인에는 촬영 날짜순으로 동영상이 표시되며, 즐겨찾기에는 시스템 사진 보관함에서 즐겨찾기로 지정한 동영상이 표시됩니다. 썸네일을 탭하면 재생됩니다. 구름 아이콘은 iCloud에서 다운로드해야 함을 의미합니다. 인터넷 연결을 유지하고 로딩이 끝날 때까지 기다리세요.

### 2. 길게 눌러 속도 변경

화면을 약 0.35초 동안 길게 누르면 해당 영역의 속도가 적용됩니다. 기본값은 왼쪽 위 20%, 왼쪽 아래 40%, 오른쪽 위 60%, 오른쪽 아래 80%입니다. 손가락을 떼면 정상 속도로 돌아갑니다.

설정의 길게 누르기 영역에서 사각형을 탭하여 속도를 1%–400%로 설정할 수 있습니다. 100%는 정상 속도이며, 더 낮은 값은 느리게, 더 높은 값은 빠르게 재생합니다.

화면을 탭하면 재생 컨트롤이 표시되거나 숨겨집니다. 두 손가락으로 핀치하여 1–6배 확대하고 두 손가락으로 드래그하여 확대된 화면을 이동할 수 있습니다. 한 손가락으로 충분히 아래로 드래그한 후 놓으면 플레이어를 종료합니다.

### 3. 미리보기 및 저장

유효한 배속 구간을 만든 후 손가락을 떼면 오른쪽 위에 클립 컨트롤이 나타납니다. 가운데 썸네일은 미리보기, 왼쪽 버튼은 Live Photo 저장, 오른쪽 버튼은 동영상 저장입니다. 클립에는 해당 길게 누르기 시점의 속도, 프레임 보간 및 음높이 설정이 적용됩니다. 다시 길게 누르면 저장 대기 중인 클립이 교체됩니다.

내보내기는 원본을 덮어쓰지 않고 사진 보관함에 새 항목을 만듭니다. 처리와 저장이 완료되면 사진 앱에서 결과를 확인하세요.

### 4. 무료 버전 및 Pro

무료 버전에서는 원본 동영상 하나당 한 번의 성공적인 내보내기가 가능하며 동영상과 Live Photo 형식이 이 횟수를 공유합니다. 실패하거나 취소한 내보내기는 횟수를 차감하지 않습니다. 같은 원본을 다시 열거나 새 구간을 만들어도 횟수가 초기화되지 않습니다.

Pro는 일회성 구매로 내보내기 횟수 제한을 해제하고 부드러운 슬로 모션, 24–60 fps 목표 프레임률 조절 및 음높이 유지를 활성화합니다. 실제 가격은 App Store 표시 가격을 따릅니다. 설정에서 Pro 잠금 해제를 선택하거나, 이미 구매했다면 구매 복원을 사용하세요. 원래 구매에 사용한 Apple 계정으로 로그인해야 합니다. 구매나 복원에는 인터넷 연결이 필요할 수 있습니다.

부드러운 슬로 모션은 낮은 속도에서 연속성을 개선할 수 있지만 빠른 움직임에는 잔상이 생길 수 있으며 결과는 동영상과 기기에 따라 달라집니다. 음높이 유지는 기본적으로 꺼져 있습니다. 켜면 배속에 따른 음높이 변화를 줄이지만 매우 낮은 속도에서는 음색이 달라질 수 있습니다. 일부 불안정한 오디오 클립은 왜곡을 줄이기 위해 음량이 낮아지거나 자연스럽게 음높이가 변하는 방식으로 전환될 수 있습니다.

### 5. 동영상 관리

목록의 썸네일을 길게 눌러 즐겨찾기에 추가하거나 해제하거나 삭제할 수 있습니다. 선택 기능으로 여러 항목을 한 번에 처리할 수 있습니다. 이 작업은 시스템 사진 보관함에도 반영되므로 삭제 확인 전에 선택한 항목을 점검하세요.

### 문제 해결

- **동영상이 표시되지 않음**: 전체 사진 접근 권한과 사진 보관함에 동영상이 있는지 확인하세요.
- **iCloud 동영상이 재생되지 않음**: 네트워크와 iCloud 사진 상태를 확인하고 먼저 사진 앱에서 열어 보세요.
- **클립을 저장할 수 없음**: 사진 권한, 저장 공간 및 무료 내보내기 횟수를 확인하세요. 다운로드와 처리가 완료된 후 다시 시도하세요.
- **Pro가 잠금 해제되지 않음**: 구매를 복원하고 Apple 계정과 네트워크를 확인하세요. 승인 대기 중인 구매는 먼저 승인되어야 합니다.

### 기술 지원

문제, 의견 또는 제안은 다음 이메일로 보내 주세요:

[niels_fengfeng@gmail.com](mailto:niels_fengfeng@gmail.com)

기기 모델, iOS 버전, 앱 버전, 재현 단계 및 오류 메시지를 알려 주세요. 개인 동영상이나 전체 사진 보관함을 보낼 필요는 없습니다. 스크린샷을 첨부하는 경우 개인정보를 가려 주세요.

[개인정보 처리방침](/links/slow-player/privacy/#ko)

---

## 使い方（日本語） {#ja}

Variable-speed player（プロジェクト名：slow-player）は、iOS 17 以降の iPhone 用動画プレーヤーです。動画を長押しして再生速度を変更し、その区間を動画または Live Photo として保存できます。

### 1. 動画を開く

初回起動時に写真ライブラリへのフルアクセスを許可してください。制限付きアクセスを選んだ場合やアクセスを拒否した場合は、iOS の設定でアプリの写真アクセス権限を変更してください。

タイムラインには撮影日順に動画が表示され、お気に入りにはシステムの写真ライブラリでお気に入りにした動画が表示されます。サムネイルをタップすると再生できます。雲のアイコンは iCloud からのダウンロードが必要なことを示します。インターネット接続を維持して読み込み完了をお待ちください。

### 2. 長押しで速度を変更

画面を約 0.35 秒長押しすると、その領域の速度が適用されます。初期値は左上 20%、左下 40%、右上 60%、右下 80% です。指を離すと通常速度に戻ります。

設定の長押し領域のマスをタップすると、速度を 1%–400% に変更できます。100% が通常速度で、それより低い値はスロー再生、高い値は高速再生です。

画面をタップすると再生コントロールを表示・非表示にできます。2本指のピンチで 1–6 倍に拡大し、2本指でドラッグして拡大した画面を移動できます。1本指で十分に下へドラッグしてから離すと、プレーヤーを閉じます。

### 3. プレビューと保存

有効な変速区間を作成して指を離すと、右上にクリップのコントロールが表示されます。中央のサムネイルはプレビュー、左のボタンは Live Photo 保存、右のボタンは動画保存です。クリップには、その長押し開始時の速度、フレーム補間および音程の設定が適用されます。再び長押しすると、保存待ちのクリップが置き換わります。

書き出しは元の動画を上書きせず、写真ライブラリに新しい項目を作成します。処理と保存の完了後、「写真」で結果を確認してください。

### 4. 無料版と Pro

無料版では、元の動画1本につき1回の書き出しに成功できます。動画と Live Photo はこの回数を共有します。失敗やキャンセルでは回数を消費しません。同じ動画を開き直したり、新しい区間を作成したりしても回数はリセットされません。

Pro は買い切りで、書き出し回数制限を解除し、滑らかなスロー再生、24–60 fps の目標フレームレート調整および音程の維持を利用可能にします。価格は App Store の表示に従います。設定から Pro のロック解除を選択してください。購入済みの場合は購入の復元を使用し、購入時の Apple Account にサインインしていることを確認してください。購入や復元にはインターネット接続が必要な場合があります。

滑らかなスロー再生は低速時の連続性を改善しますが、速い動きでは残像が生じる場合があり、効果は動画と端末によって異なります。音程の維持は初期状態ではオフです。有効にすると変速による音程変化を減らせますが、極端に低い速度では音色が変化することがあります。不安定な音声クリップでは、歪みを減らすために音量を下げたり、自然な音程変化を伴う処理に戻したりする場合があります。

### 5. 動画の管理

一覧のサムネイルを長押しすると、お気に入りへの追加・解除や削除ができます。選択機能で複数の動画をまとめて操作できます。変更はシステムの写真ライブラリにも反映されるため、削除を確定する前に選択項目を確認してください。

### よくある問題

- **動画が表示されない**：写真へのフルアクセスと、ライブラリに動画があることを確認してください。
- **iCloud の動画を再生できない**：ネットワークと iCloud 写真の状態を確認し、先に「写真」で動画を開いてみてください。
- **クリップを保存できない**：写真のアクセス権限、空き容量、無料の書き出し回数を確認してください。ダウンロードと処理の完了後に再試行してください。
- **Pro が有効にならない**：購入を復元し、Apple Account とネットワークを確認してください。承認待ちの購入は、先に承認が必要です。

### テクニカルサポート

問題、ご意見、ご提案は次のメールアドレスへお送りください：

[niels_fengfeng@gmail.com](mailto:niels_fengfeng@gmail.com)

端末の機種、iOS とアプリのバージョン、再現手順、エラーメッセージを記載してください。個人的な動画や写真ライブラリ全体を送る必要はありません。スクリーンショットを添付する場合は、個人情報を隠してください。

[プライバシーポリシー](/links/slow-player/privacy/#ja)
