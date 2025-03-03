all: start

start:
	yarn run dev -- --host 0.0.0.0

# Capacitor Android commands
android-sync:
	npx cap sync android

android-build: android-sync
	yarn build
	npx cap sync android
	cd android && ./gradlew assembleDebug

# ADB Wireless Debug commands
android-pair:
	@echo "请在安卓设备的开发者选项中打开"无线调试"，并点击"使用配对码配对设备""
	@echo "输入设备显示的 IP 地址和端口（格式如：192.168.1.100:40001）:"
	@read ip_port; \
	echo "输入设备显示的 6 位配对码:"; \
	read pair_code; \
	adb pair $$ip_port $$pair_code

android-connect:
	@echo "输入已配对设备的调试 IP 地址和端口（格式如：192.168.1.100:5555）:"
	@read debug_ip_port; \
	adb connect $$debug_ip_port

android-install: android-build
	@echo "检查 ADB 设备连接状态..."
	@adb devices
	@if [ $$(adb devices | grep -c "device$$") -eq 0 ]; then \
		echo "错误：没有找到已连接的设备"; \
		echo "请先运行 make android-pair 进行配对，然后运行 make android-connect 连接设备"; \
		exit 1; \
	fi
	@echo "开始安装 APK..."
	adb install -r android/app/build/outputs/apk/debug/app-debug.apk

android: android-build android-install

# Clean build artifacts
clean:
	rm -rf android/app/build/
	rm -rf dist/

.PHONY: start android-sync android-build android-pair android-connect android-install android clean