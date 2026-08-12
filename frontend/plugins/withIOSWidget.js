const {
  withXcodeProject,
  withEntitlementsPlist,
  withDangerousMod,
  IOSConfig,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const APP_GROUP = 'group.com.roisoyboy.psycholyrics';
const WIDGET_TARGET = 'LyricLearnWidget';
const WIDGET_BUNDLE_ID = 'com.roisoyboy.psycholyrics.widget';

// ── Swift sources ─────────────────────────────────────────────────────────────

const WIDGET_SWIFT = `import WidgetKit
import SwiftUI

struct WordEntry: TimelineEntry {
    let date: Date
    let word: String
    let partOfSpeech: String
    let hebrewShort: String
    let frequencyTier: String
    let isPinned: Bool
}

struct Provider: TimelineProvider {
    let appGroup = "${APP_GROUP}"
    let key = "lyriclearn_widget_word"

    func placeholder(in context: Context) -> WordEntry {
        WordEntry(date: Date(), word: "Persevere", partOfSpeech: "verb",
                  hebrewShort: "להתמיד", frequencyTier: "MEDIUM", isPinned: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (WordEntry) -> Void) {
        completion(loadEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WordEntry>) -> Void) {
        let entry = loadEntry()
        // Refresh at the next midnight so the daily word rotates automatically
        let midnight = Calendar.current.startOfDay(for: Date()).addingTimeInterval(86_400)
        let timeline = Timeline(entries: [entry], policy: .after(midnight))
        completion(timeline)
    }

    private func loadEntry() -> WordEntry {
        guard let defaults = UserDefaults(suiteName: appGroup),
              let raw = defaults.string(forKey: key),
              let data = raw.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else {
            return WordEntry(date: Date(), word: "Persevere", partOfSpeech: "verb",
                             hebrewShort: "להתמיד", frequencyTier: "MEDIUM", isPinned: false)
        }
        return WordEntry(
            date: Date(),
            word: json["word"] as? String ?? "Persevere",
            partOfSpeech: json["partOfSpeech"] as? String ?? "",
            hebrewShort: json["hebrewShort"] as? String ?? "",
            frequencyTier: json["frequencyTier"] as? String ?? "MEDIUM",
            isPinned: json["isPinned"] as? Bool ?? false
        )
    }
}

@main
struct LyricLearnWidget: Widget {
    let kind = "LyricLearnWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            LyricLearnWidgetView(entry: entry)
        }
        .configurationDisplayName("LyricLearn")
        .description("מילה יומית מהפסיכומטרי")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
`;

const WIDGET_VIEW_SWIFT = `import SwiftUI
import WidgetKit

struct LyricLearnWidgetView: View {
    let entry: WordEntry
    @Environment(\\.widgetFamily) var family

    var tierColor: Color {
        switch entry.frequencyTier {
        case "HIGH":   return Color(red: 0.97, green: 0.42, blue: 0.54) // #F76A8A
        case "LOW":    return Color(red: 0.42, green: 0.97, blue: 0.78) // #6AF7C8
        default:       return Color(red: 1.00, green: 0.78, blue: 0.20) // #FFC832
        }
    }

    var body: some View {
        ZStack {
            Color(red: 0.11, green: 0.11, blue: 0.16) // #1C1C28
                .ignoresSafeArea()

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(entry.word + (entry.isPinned ? "  📌" : ""))
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(Color(red: 0.94, green: 0.93, blue: 1.0))
                        .lineLimit(1)
                    Spacer()
                }

                if family != .systemSmall {
                    HStack(spacing: 8) {
                        if !entry.partOfSpeech.isEmpty {
                            Text(entry.partOfSpeech)
                                .font(.system(size: 12, weight: .regular))
                                .italic()
                                .foregroundColor(Color(red: 0.42, green: 0.97, blue: 0.78))
                        }
                        Text(entry.frequencyTier)
                            .font(.system(size: 10, weight: .bold))
                            .textCase(.uppercase)
                            .foregroundColor(tierColor)
                    }
                }

                Spacer(minLength: 4)

                Text(entry.hebrewShort)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(Color(red: 0.94, green: 0.93, blue: 1.0))
                    .multilineTextAlignment(.trailing)
                    .environment(\\.layoutDirection, .rightToLeft)
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }
            .padding(14)
        }
    }
}
`;

const WIDGET_INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSExtension</key>
    <dict>
        <key>NSExtensionPointIdentifier</key>
        <string>com.apple.widgetkit-extension</string>
    </dict>
</dict>
</plist>
`;

const WIDGET_ENTITLEMENTS = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.application-groups</key>
    <array>
        <string>${APP_GROUP}</string>
    </array>
</dict>
</plist>
`;

// ── Plugin ────────────────────────────────────────────────────────────────────

function withIOSWidget(config) {
  // 1. Add App Group entitlement to the main app target
  config = withEntitlementsPlist(config, (c) => {
    const groups = c.modResults['com.apple.security.application-groups'] || [];
    if (!groups.includes(APP_GROUP)) groups.push(APP_GROUP);
    c.modResults['com.apple.security.application-groups'] = groups;
    return c;
  });

  // 2. Write Swift source files and entitlements into ios/LyricLearnWidget/
  config = withDangerousMod(config, [
    'ios',
    async (c) => {
      const iosRoot = c.modRequest.platformProjectRoot; // ios/
      const widgetDir = path.join(iosRoot, WIDGET_TARGET);
      fs.mkdirSync(widgetDir, { recursive: true });

      fs.writeFileSync(path.join(widgetDir, `${WIDGET_TARGET}.swift`), WIDGET_SWIFT);
      fs.writeFileSync(path.join(widgetDir, `${WIDGET_TARGET}View.swift`), WIDGET_VIEW_SWIFT);
      fs.writeFileSync(path.join(widgetDir, 'Info.plist'), WIDGET_INFO_PLIST);
      fs.writeFileSync(path.join(widgetDir, `${WIDGET_TARGET}.entitlements`), WIDGET_ENTITLEMENTS);
      return c;
    },
  ]);

  // 3. Add the widget extension target to the Xcode project
  config = withXcodeProject(config, (c) => {
    const xcodeProject = c.modResults;
    const { uuid: targetUUID } = IOSConfig.XcodeUtils.addFrameworksToDisplayNameTargets(
      xcodeProject,
      []
    );

    // Only add the target once
    const targets = xcodeProject.pbxNativeTargetSection();
    const alreadyExists = Object.values(targets).some(
      (t) => t && t.name === WIDGET_TARGET
    );
    if (alreadyExists) return c;

    const widgetTargetUUID = xcodeProject.generateUuid();
    const buildConfigListUUID = xcodeProject.generateUuid();
    const debugConfigUUID = xcodeProject.generateUuid();
    const releaseConfigUUID = xcodeProject.generateUuid();
    const sourcesBuildPhaseUUID = xcodeProject.generateUuid();
    const resourcesBuildPhaseUUID = xcodeProject.generateUuid();
    const frameworksBuildPhaseUUID = xcodeProject.generateUuid();
    const widgetKitFrameworkFileRefUUID = xcodeProject.generateUuid();
    const swiftFileRef1UUID = xcodeProject.generateUuid();
    const swiftFileRef2UUID = xcodeProject.generateUuid();
    const infoPlistFileRefUUID = xcodeProject.generateUuid();
    const entitlementsFileRefUUID = xcodeProject.generateUuid();
    const buildFile1UUID = xcodeProject.generateUuid();
    const buildFile2UUID = xcodeProject.generateUuid();
    const widgetKitBuildFileUUID = xcodeProject.generateUuid();

    const proj = xcodeProject;

    // File references for Swift sources
    proj.addToPbxFileReferenceSection({
      uuid: swiftFileRef1UUID,
      obj: {
        isa: 'PBXFileReference',
        lastKnownFileType: 'sourcecode.swift',
        name: `${WIDGET_TARGET}.swift`,
        path: `${WIDGET_TARGET}/${WIDGET_TARGET}.swift`,
        sourceTree: '"<group>"',
      },
    });
    proj.addToPbxFileReferenceSection({
      uuid: swiftFileRef2UUID,
      obj: {
        isa: 'PBXFileReference',
        lastKnownFileType: 'sourcecode.swift',
        name: `${WIDGET_TARGET}View.swift`,
        path: `${WIDGET_TARGET}/${WIDGET_TARGET}View.swift`,
        sourceTree: '"<group>"',
      },
    });
    proj.addToPbxFileReferenceSection({
      uuid: infoPlistFileRefUUID,
      obj: {
        isa: 'PBXFileReference',
        lastKnownFileType: 'text.plist.xml',
        name: 'Info.plist',
        path: `${WIDGET_TARGET}/Info.plist`,
        sourceTree: '"<group>"',
      },
    });
    proj.addToPbxFileReferenceSection({
      uuid: entitlementsFileRefUUID,
      obj: {
        isa: 'PBXFileReference',
        lastKnownFileType: 'text.plist.entitlements',
        name: `${WIDGET_TARGET}.entitlements`,
        path: `${WIDGET_TARGET}/${WIDGET_TARGET}.entitlements`,
        sourceTree: '"<group>"',
      },
    });

    // WidgetKit framework
    proj.addToPbxFileReferenceSection({
      uuid: widgetKitFrameworkFileRefUUID,
      obj: {
        isa: 'PBXFileReference',
        lastKnownFileType: 'wrapper.framework',
        name: 'WidgetKit.framework',
        path: 'System/Library/Frameworks/WidgetKit.framework',
        sourceTree: SDKROOT,
      },
    });

    // Build files
    proj.addToPbxBuildFileSection({
      uuid: buildFile1UUID,
      obj: { isa: 'PBXBuildFile', fileRef: swiftFileRef1UUID },
    });
    proj.addToPbxBuildFileSection({
      uuid: buildFile2UUID,
      obj: { isa: 'PBXBuildFile', fileRef: swiftFileRef2UUID },
    });
    proj.addToPbxBuildFileSection({
      uuid: widgetKitBuildFileUUID,
      obj: { isa: 'PBXBuildFile', fileRef: widgetKitFrameworkFileRefUUID },
    });

    // Build phases
    proj.hash.project.objects['PBXSourcesBuildPhase'] = proj.hash.project.objects['PBXSourcesBuildPhase'] || {};
    proj.hash.project.objects['PBXSourcesBuildPhase'][sourcesBuildPhaseUUID] = {
      isa: 'PBXSourcesBuildPhase',
      buildActionMask: 2147483647,
      files: [`${buildFile1UUID} /* ${WIDGET_TARGET}.swift */`, `${buildFile2UUID} /* ${WIDGET_TARGET}View.swift */`],
      runOnlyForDeploymentPostprocessing: 0,
    };

    proj.hash.project.objects['PBXResourcesBuildPhase'] = proj.hash.project.objects['PBXResourcesBuildPhase'] || {};
    proj.hash.project.objects['PBXResourcesBuildPhase'][resourcesBuildPhaseUUID] = {
      isa: 'PBXResourcesBuildPhase',
      buildActionMask: 2147483647,
      files: [],
      runOnlyForDeploymentPostprocessing: 0,
    };

    proj.hash.project.objects['PBXFrameworksBuildPhase'] = proj.hash.project.objects['PBXFrameworksBuildPhase'] || {};
    proj.hash.project.objects['PBXFrameworksBuildPhase'][frameworksBuildPhaseUUID] = {
      isa: 'PBXFrameworksBuildPhase',
      buildActionMask: 2147483647,
      files: [`${widgetKitBuildFileUUID} /* WidgetKit.framework */`],
      runOnlyForDeploymentPostprocessing: 0,
    };

    // Build configurations
    const sharedSettings = {
      ARCHS: '"arm64"',
      CODE_SIGN_STYLE: 'Automatic',
      INFOPLIST_FILE: `"${WIDGET_TARGET}/Info.plist"`,
      PRODUCT_BUNDLE_IDENTIFIER: `"${WIDGET_BUNDLE_ID}"`,
      PRODUCT_NAME: `"${WIDGET_TARGET}"`,
      SKIP_INSTALL: 'YES',
      SWIFT_VERSION: '5.0',
      TARGETED_DEVICE_FAMILY: '"1,2"',
      'CODE_SIGN_ENTITLEMENTS[sdk=iphoneos*]': `"${WIDGET_TARGET}/${WIDGET_TARGET}.entitlements"`,
    };

    proj.hash.project.objects['XCBuildConfiguration'] = proj.hash.project.objects['XCBuildConfiguration'] || {};
    proj.hash.project.objects['XCBuildConfiguration'][debugConfigUUID] = {
      isa: 'XCBuildConfiguration',
      buildSettings: { ...sharedSettings, DEBUG_INFORMATION_FORMAT: '"dwarf"', MTL_ENABLE_DEBUG_INFO: 'INCLUDE_SOURCE' },
      name: 'Debug',
    };
    proj.hash.project.objects['XCBuildConfiguration'][releaseConfigUUID] = {
      isa: 'XCBuildConfiguration',
      buildSettings: { ...sharedSettings, DEBUG_INFORMATION_FORMAT: '"dwarf-with-dsym"', VALIDATE_PRODUCT: 'YES' },
      name: 'Release',
    };
    proj.hash.project.objects['XCConfigurationList'] = proj.hash.project.objects['XCConfigurationList'] || {};
    proj.hash.project.objects['XCConfigurationList'][buildConfigListUUID] = {
      isa: 'XCConfigurationList',
      buildConfigurations: [debugConfigUUID, releaseConfigUUID],
      defaultConfigurationIsVisible: 0,
      defaultConfigurationName: 'Release',
    };

    // Native target
    proj.hash.project.objects['PBXNativeTarget'] = proj.hash.project.objects['PBXNativeTarget'] || {};
    proj.hash.project.objects['PBXNativeTarget'][widgetTargetUUID] = {
      isa: 'PBXNativeTarget',
      buildConfigurationList: buildConfigListUUID,
      buildPhases: [sourcesBuildPhaseUUID, frameworksBuildPhaseUUID, resourcesBuildPhaseUUID],
      buildRules: [],
      dependencies: [],
      name: WIDGET_TARGET,
      productName: WIDGET_TARGET,
      productType: '"com.apple.product-type.app-extension"',
    };

    // Add target to project's targets list
    const projectObj = proj.getFirstProject().firstProject;
    if (projectObj.targets) {
      projectObj.targets.push(widgetTargetUUID);
    }

    return c;
  });

  return config;
}

const SDKROOT = 'SDKROOT';
module.exports = withIOSWidget;
