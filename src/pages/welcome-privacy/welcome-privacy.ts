import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { WelcomeConnect3Page } from '../welcome-connect3/welcome-connect3';

/**
 * Generated class for the WelcomePrivacyPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-welcome-privacy',
  templateUrl: 'welcome-privacy.html',
})
export class WelcomePrivacyPage {

  constructor(public navCtrl: NavController, public navParams: NavParams) {
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad WelcomePrivacyPage');
  }

  public gotoWelcomeConnect3Page() {
    this.navCtrl.push(WelcomeConnect3Page, {});
  }

}
