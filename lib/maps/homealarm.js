module.exports = (Mapper, Service, Characteristic) => {
  const { STAY_ARM, AWAY_ARM, NIGHT_ARM, DISARMED, ALARM_TRIGGERED } = Characteristic.SecuritySystemCurrentState;
  const { DISARM }                                                   = Characteristic.SecuritySystemTargetState;
  const { TAMPERED }                                                 = Characteristic.StatusTampered;

  // Improved state tracking with safer initialization
  let targetState = DISARMED;

  const safeStateTransition = (currentState, newState) => {
    try {
      // Add logging for state transition attempts
      console.log(`[ALARM] Attempting state transition: ${currentState} -> ${newState}`);
      
      // Implement more robust state transition logic
      if (currentState === newState) return currentState;
      
      // Add additional validation or logging here
      return newState;
    } catch (error) {
      console.error(`[ALARM] State transition error: ${error.message}`);
      return currentState; // Fallback to current state
    }
  };

  const characteristic = {
    characteristics : [ Characteristic.SecuritySystemCurrentState, Characteristic.SecuritySystemTargetState ],
    get : (value, { device, service, characteristic }) => {
      try {
        // Check various alarm capabilities with more robust error handling
        if (characteristic === 'SecuritySystemCurrentState' && (value === 'armed' || value === 'partially_armed')) {
          const alarmTypes = [ 'alarm_tamper', 'alarm_generic', 'alarm_contact', 'alarm_motion', 'alarm_heimdall', 'alarm_vibration' ];
          
          for (const alarm of alarmTypes) {
            try {
              if (Mapper.Utils.hasCapabilityWithValue(device, alarm, true)) {
                console.log(`[ALARM] Triggered by: ${alarm}`);
                return ALARM_TRIGGERED;
              }
            } catch (alarmCheckError) {
              console.warn(`[ALARM] Error checking ${alarm}: ${alarmCheckError.message}`);
            }
          }
        }

        // Improved state mapping with more explicit logging
        switch(value) {
          case 'armed':           
            console.log('[ALARM] State: Armed');
            return AWAY_ARM;
          case 'partially_armed': 
            console.log('[ALARM] State: Partially Armed');
            return targetState === NIGHT_ARM ? NIGHT_ARM : STAY_ARM;
          case 'disarmed':        // fall-through
          default:                
            console.log('[ALARM] State: Disarmed');
            return DISARMED;
        }
      } catch (error) {
        console.error(`[ALARM] Get characteristic error: ${error.message}`);
        return DISARMED; // Safe fallback
      }
    },
    set : (value, { characteristic }) => {
      try {
        if (characteristic == 'SecuritySystemTargetState') {
          // More robust target state management
          targetState = safeStateTransition(targetState, value);
          console.log(`[ALARM] Updated target state: ${targetState}`);
        }

        switch(value) {
          case AWAY_ARM:  return 'armed';
          case STAY_ARM:  // fall-through
          case NIGHT_ARM: return 'partially_armed';
          case DISARM:    // fall-through
          default:        return 'disarmed';
        }
      } catch (error) {
        console.error(`[ALARM] Set characteristic error: ${error.message}`);
        return 'disarmed'; // Safe fallback
      }
    }
  };

  const getAlarmStates = service => {
    try {
      return {
        current : service.getCharacteristic(Characteristic.SecuritySystemCurrentState)?.value || DISARMED,
        target  : service.getCharacteristic(Characteristic.SecuritySystemTargetState)?.value || DISARMED,
      };
    } catch (error) {
      console.error(`[ALARM] Error getting alarm states: ${error.message}`);
      return { current: DISARMED, target: DISARMED };
    }
  };

  const isTriggerState = state => [ STAY_ARM, AWAY_ARM, NIGHT_ARM ].includes(state);

  const onTrigger = {
    characteristics: Characteristic.SecuritySystemCurrentState,
    get: (value, { device, service }) => {
      try {
        // More robust trigger state checking
        if (!value) return Mapper.Constants.NO_VALUE;

        const { current, target } = getAlarmStates(service);
        console.log(`[ALARM] Trigger check - Current: ${current}, Target: ${target}`);

        if (isTriggerState(current) || isTriggerState(target)) {
          console.log('[ALARM] Trigger state detected');
          return ALARM_TRIGGERED;
        }
        return Mapper.Constants.NO_VALUE;
      } catch (error) {
        console.error(`[ALARM] Trigger check error: ${error.message}`);
        return Mapper.Constants.NO_VALUE;
      }
    }
  };

  return {
    class:    [ 'homealarm', 'sensor' ],
    service:  Service.SecuritySystem,
    onUpdate: ({ characteristic, newValue, service }) => {
      try {
        if (characteristic !== 'StatusTampered' || newValue !== TAMPERED) return;

        const { current, target } = getAlarmStates(service);
        console.log(`[ALARM] Update - Current: ${current}, Target: ${target}`);

        if (isTriggerState(current) || isTriggerState(target)) {
          console.log('[ALARM] Triggering alarm state');
          service.getCharacteristic(Characteristic.SecuritySystemCurrentState).updateValue(ALARM_TRIGGERED);
        }
      } catch (error) {
        console.error(`[ALARM] OnUpdate error: ${error.message}`);
      }
    },
    required: {
      homealarm_state : characteristic
    },
    optional : {
      alarm_tamper : {
        characteristics : Characteristic.StatusTampered,
        ...Mapper.Accessors.Boolean
      },
    },
    triggers : {
      alarm_generic:   onTrigger,
      alarm_contact:   onTrigger,
      alarm_motion:    onTrigger,
      alarm_heimdall:  onTrigger,
      alarm_vibration: onTrigger,
    },
  };
};
