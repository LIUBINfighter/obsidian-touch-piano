import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { PlayingView } from "./playing-view"; // 新增引入

// Remember to rename these classes and interfaces!

interface TouchPianoSettings {
	mySetting: string;
	midiFiles: MidiFileInfo[];
}

interface MidiFileInfo {
	name: string;
	path: string;
	date: number; // timestamp for sorting
}

const DEFAULT_SETTINGS: TouchPianoSettings = {
	mySetting: 'default',
	midiFiles: [{
		name: 'Default MIDI',
		path: 'obsidian-touch-piano/.obsidian/plugins/obsidian-touch-piano/src/assets/Ah-vous-dirai-je-Maman-via-Twelve-Variations.mid',
		date: Date.now()
	}]
}

export default class TouchPianoPlugin extends Plugin {
	settings: TouchPianoSettings;

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TouchPianoSettingTab(this.app, this));
		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
		// 注册 PlayingView
		this.registerView(PlayingView.VIEW_TYPE, leaf => new PlayingView(leaf, this));

		// 添加侧边栏图标点击激活 PlayingView
		this.addRibbonIcon('play-circle', 'Open Playing View', (evt: MouseEvent) => {
			this.app.workspace.getLeaf(false).setViewState({
				type: PlayingView.VIEW_TYPE,
				active: true
			});
		});

		// 注册命令激活 PlayingView
		this.addCommand({
			id: 'open-playing-view',
			name: 'Open Playing View',
			callback: () => {
				this.app.workspace.getLeaf(false).setViewState({
					type: PlayingView.VIEW_TYPE,
					active: true
				});
			}
		});
	}

	onunload() {
		// 卸载 PlayingView
		this.app.workspace.detachLeavesOfType(PlayingView.VIEW_TYPE);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class TouchPianoModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class TouchPianoSettingTab extends PluginSettingTab {
	plugin: TouchPianoPlugin;

	constructor(app: App, plugin: TouchPianoPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
