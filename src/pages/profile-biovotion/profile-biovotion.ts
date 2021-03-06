import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, AlertController } from 'ionic-angular';
import { ProfilePage } from '../profile/profile';
import { TabsPage } from '../tabs/tabs';
import { BiovotionConnector, BiovotionSensor, BatteryInformation, SensorDataType, SensorDataEntry, SENSORDATATYPE } from '@ionic-native/biovotion-connector';
import { Storage } from '@ionic/storage';
import { ToastController } from 'ionic-angular';

//#MIDATA imports
import { MidataService } from '../../services/MidataService';
import { HeartRate, StepsCount, Observation } from 'Midata';
import * as Globals from '../../../typings/globals';

//TODO kochd1: daten mittels der .buffer() filtern und allenfalls zusätzlich filter bei der midata load() anpassen.


/**
 * Generated class for the WelcomeConnectPage page.
 * @author kochd1 
 */
@IonicPage()
@Component({
  selector: 'page-profile-biovotion',
  templateUrl: 'profile-biovotion.html',
})
export class ProfileBiovotionPage {

  /**
   * name of this sensor
   */
  sensor1: BiovotionSensor;

  /**
   * Indicates, if the Biovotion Everion Sensor is connected to GradUp.
   * Default -> false
   */
  isConnectedToSensor: boolean = false;

   /**
   * key for local storage of isConnectedToSensor value
   */
  key_sensor:string="isConnectedToSensor";

  /**
   * toggle value -> true if toggled, false if not
   */
  isToggled: boolean = false;

  /**
   * key for local storage of isToggled value
   */
  key_toggle:string="isToggled";

  isPermitted:boolean = false;

  /**
   * not in use at the moment
   * Stores the current heart rate.
   */
  currentHeartRate: number;

  /**
   * not in use at the moment
   * amount of steps during 10 seconds
   */
  amountOfSteps: number ;

  /**
   * #MIDATA -> array for the heart rate, value: number }>; 
     store the raw data in this array.
   */
  heartRateData: Array<{date: Date, value: number }>;

   /**
   * #MIDATA -> array for the steps, value: number }>; 
     store the raw data in this array.
   */
  stepData: Array<{date: Date, value: number }>;


  constructor(public navCtrl: NavController, 
    public navParams: NavParams, 
    private biovotion: BiovotionConnector,
    private storage: Storage,
    private midataService: MidataService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController) {

    // set toggle to isConnectedToSensor
    //this.biovotion.isConnected().then((connectionState: boolean) => {
      
    //}) ;
    
    this.currentHeartRate = -1;
    this.amountOfSteps = -1;

    //#MIDATA
    //this.dailyData = this.navParams.get('data');
    this.heartRateData = new Array<{ date: Date, value: number }>();
    this.stepData = new Array<{ date: Date, value: number }>();
  }

  ionViewWillEnter(){
    this.storage.get(this.key_toggle).then((value) => {
      this.isToggled = value;
      console.log('ionViewWillEnter -> isToggled?:', value);
    });

    this.storage.get(this.key_sensor).then((value) => {
      this.isConnectedToSensor = value;
      console.log('ionViewWillEnter -> isConnectedToSensor?:', value);
    });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad WelcomeConnectPage');
    
    //#MIDATA -> load the elements
    this.loadData();
  }

  /**
   * Handles the sensor connection
   * calls connectSensor(), if isConnectedToSensor == false
   * otherwise calls disconnectSensor()
   */
  handleSensorConnection() {

    //this.storage.set(this.key_toggle, this.isToggled);
    this.storage.get(this.key_toggle).then((value) => {
      console.log('handleSensorConnection() -> storage -> isToggled?:', value);
    });

    console.log("handleSensorConnection() -> sensor connected?:", this.isConnectedToSensor);

    if(this.isConnectedToSensor) {
      console.log("about to disconnect from sensor...");
      this.disconnectSensor();

    } else {
      console.log("about to connect to sensor...");
      this.askUserPermission();

    }
  }

  /**
   * Popup to ask user for permission to connect the sensor.
   */
  askUserPermission(){
    console.log("askUserPermission() called");

    let alert = this.alertCtrl.create({
      title: 'Verbindung mit Sensor',
      subTitle: 'GradUp möchte eine Bluetooth-Verbindung zu Ihrem Biovotion Everion Sensor herstellen.',
      buttons: [
        {
          text: 'Erlauben',
          handler: () =>{
          console.log("askUserPermission() -> permission ok");
          this.isPermitted = true;
          this.connectSensor();
          /*if(!this.isConnectedToSensor)
          {
            this.isToggled = false; //in trial
          }*/
        }
      },
      {
        text: 'Abbrechen',
        handler: () =>{
          this.isToggled = false;
          this.gotoProfilePage();
        }

      }
  ]
});

alert.present();
  
  }

  /**
   * Connects to sensor after toggle change and then navigates to tabsPage.
   */
  connectSensor() {
    console.log("connectSensor() called");

    //if(this.isPermitted){

    this.biovotion.scan().subscribe((sensor: BiovotionSensor) => {
      this.sensor1 = sensor;
       // for now we only want to connect with this specific sensor
       if (this.sensor1.address == "FE:10:32:95:6C:08") {
        this.biovotion.connect(this.sensor1).then(() => {

          this.isConnectedToSensor = true;

          this.storage.set(this.key_sensor, this.isConnectedToSensor);
          this.storage.get(this.key_sensor).then((value) => {
          console.log('storage -> isConnectedToSensor?:', value);
          });

          this.storage.set(this.key_toggle, this.isToggled); //in trial
          
          console.log("connectSensor() -> sensor connected?: ", this.isConnectedToSensor);
          console.log("battery state:", this.biovotion.getBatteryState);
          this.presentToast();
          //this.isToggled = true;

          let dataToRequest: SENSORDATATYPE[] = [];
          dataToRequest.push(SENSORDATATYPE.heartRate);
          dataToRequest.push(SENSORDATATYPE.steps);

          this.biovotion.readLiveData(dataToRequest)
          .subscribe((liveData: SensorDataEntry) => {
            console.log(liveData.heartRate.value);
            var heartRate = Number(liveData.heartRate.value); //Midata -> only for first test


            console.log(liveData.steps.value);
            var amountOfSteps = Number(liveData.steps.value); //Midata -> only for first test

            this.saveHeartRateValueToMidata(heartRate);
           this.saveStepAmountToMidata(amountOfSteps);
            

          });

          

          this.navCtrl.push(TabsPage, {});
        }).catch(error => {
          console.log("Connection Error: " + error);
          this.isToggled = false;  //in trial
        });

          //this.measureData();

      }

 
    },(error) => { console.log(error);
      this.isToggled = false; // in trial
      console.log("scanError: connectSensor() -> is Toggled:?", this.isToggled);
      this.presentToast();
    
    });
      
    
    //this.navCtrl.push(TabsPage, {});
    //}
    //console.log("no permission to connect!");
    //this.isToggled = false; //in trial
  }

  measureData(){
    console.log("about to measure data...")

  
  }

  /**
   * Disconnects the Sensor after toggle change.
   */
  disconnectSensor(){

    this.biovotion.disconnect().then(() => {
      this.isConnectedToSensor = false;

      this.storage.set(this.key_sensor, this.isConnectedToSensor);
          this.storage.get(this.key_sensor).then((value) => {
          console.log('storage -> isConnectedToSensor?:', value);
          });

      this.storage.set(this.key_toggle, this.isToggled); //in trial

      console.log('disconnectSensor() -> sensor connected:?', this.isConnectedToSensor);
      console.log('disconnectSensor() -> isToggled:?', this.isToggled);
      this.presentToast();
      
       }).catch(error => {
      console.log("Error: " + error);
       });

  }

    /**
   * Present a Toast based on the sensor connection.
   */
  public presentToast(){
    let toastMessage:string="";
    let toastDuration:number;
  
      if(this.isConnectedToSensor){ //connectSensor()
        console.log("isConnectedToSensor:?", this.isConnectedToSensor);
        toastMessage = "Sensor erfolgreich verbunden";
        toastDuration = 3000;
      }

      else if(!this.isConnectedToSensor){ //disconnectSensor()
        console.log("isConnectedToSensor:?", this.isConnectedToSensor);
        toastMessage = "Sensor erfolgreich getrennt";
        toastDuration = 3000;
      }
  
      else{
        console.log("else");
        toastMessage = "Sensor konnte nicht verbunden werden. Prüfen Sie u. a., ob bei Ihrem Gerät Bluetooth und/oder GPS aktiviert ist sowie ob der Sensor eingeschaltet ist.";
        toastDuration = 5000;
      }
  
      let toast = this.toastCtrl.create({
        message: toastMessage,
        duration: toastDuration,
        position: 'bottom',
        cssClass: 'toast' //not working at the moment
      });
  
      toast.onDidDismiss(() => {
        console.log('Dismissed toast');
      })
  
      toast.present();
    }

  /**
   * save a new heart rate value to Midata.
   * 
   * @param heartRate 
   */
  saveHeartRateValueToMidata(heartRate: number){ //any -> provisoric
    let MessageDate = new Date();
    
     //#MIDATA persistance
     this.midataService.save(new HeartRate(heartRate, MessageDate.toISOString()));
  }

  /**
   * save a new amount of steps to Midata.
   * 
   * @param amountOfSteps 
   */
  saveStepAmountToMidata(amountOfSteps: number){
    let MessageDate = new Date();
    
    //#MIDATA persistance
    this.midataService.save(new StepsCount(amountOfSteps, MessageDate.toISOString()));
  }

   

   /**
    * #MIDATA: adds all heart rate measures to the array "heartRateData".
    * 
    * @param measure 
    * @param date 
    */
   addHeartRateMeasure(measure: number, date: Date): void {
    /*if (moment().diff(date) >= 0){

    }*/

    //push the data to the array
    this.heartRateData.push({ date: date, value: measure });

  }

   

   /**
    * #MIDATA: adds all step measures to the array "stepData".
    * 
    * @param measure 
    * @param date 
    */
   addStepMeasure(measure: number, date: Date): void {
    /*if (moment().diff(date) >= 0){

    }*/

    //push the data to the array
    this.stepData.push({ date: date, value: measure });
    
  }

   
   /**
    * #MIDATA: loads the data (FHIR Observations with code "heart rate" & "steps") from the MIDATA server
    */
   private loadData(): void {
    this.midataService.search('Observation/$lastn', { max: 1000, _sort: '-date', code: Globals.HEARTRATE.toString, patient: this.midataService.getUser().id })
      .then(response => {
        if( response.length > 0) {


          response.forEach((measure: Observation) => {
            //console.log(measure.getProperty('valueQuantity')['value'], measure.getProperty('effectiveDateTime'));
            this.addHeartRateMeasure(measure.getProperty('valueQuantity')['value'], measure.getProperty('effectiveDateTime'));
          });

          console.log(this.heartRateData);
          /* TODO:  to test */
          /* TODO: catch error */
        }
      }
      );

      this.midataService.search('Observation/$lastn', { max: 1000, _sort: '-date', code: Globals.STEPS.toString, patient: this.midataService.getUser().id })
      .then(response => {
        if( response.length > 0) {


          response.forEach((measure: Observation) => {
            //console.log(measure.getProperty('valueQuantity')['value'], measure.getProperty('effectiveDateTime'));
            this.addStepMeasure(measure.getProperty('valueQuantity')['value'], measure.getProperty('effectiveDateTime'));
          });

          console.log(this.stepData);
          /* TODO:  to test */
          /* TODO: catch error */
        }
      }
      );
  }




  public gotoTabsPage() {
    this.navCtrl.push(TabsPage, {});
  }

  public gotoProfilePage(){
    this.navCtrl.push(ProfilePage, {});
  }

}
