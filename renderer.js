let profiles = {};

document.addEventListener('DOMContentLoaded', () => {
  loadProfiles();
  displayScreens();

  const saveProfileButton = document.getElementById('save-profile');
  saveProfileButton.addEventListener('click', saveProfile);
});

async function getMonitorInfo() {
  try {
    const command = 'powershell -command "Get-PnpDevice -Class Monitor | ConvertTo-Json"';
    const { stdout } = await window.api.runCommand(command);
    // The output can be a single JSON object or an array of them.
    // The powershell command might return a string that needs to be parsed as a whole
    // if it's a list of monitors, or as individual JSON objects if they are printed one after another.
    // For now, let's assume it's a valid JSON array or a stream of JSON objects.
    // A simple way to handle both is to wrap it in an array and flatten.
    const sanitizedOutput = `[${stdout.replace(/}\s*{/g, '},{')}]`;
    return JSON.parse(sanitizedOutput);
  } catch (error) {
    console.error('Error getting monitor info:', error);
    return [];
  }
}

async function displayScreens() {
  const monitors = await getMonitorInfo();
  const screensDiv = document.getElementById('screens');
  screensDiv.innerHTML = ''; // Clear previous list

  monitors.forEach(monitor => {
    const screenDiv = document.createElement('div');
    screenDiv.classList.add('screen');
    const isEnabled = monitor.Status === 'OK';
    screenDiv.innerHTML = `
      <h3>${monitor.FriendlyName}</h3>
      <ul>
        <li><strong>InstanceId:</strong> ${monitor.InstanceId}</li>
        <li><strong>Status:</strong> ${monitor.Status}</li>
      </ul>
      <button onclick="toggleScreen('${monitor.InstanceId}', ${!isEnabled})">${isEnabled ? 'Disable' : 'Enable'}</button>
    `;
    screensDiv.appendChild(screenDiv);
  });
}

async function toggleScreen(instanceId, enable) {
  const action = enable ? 'Enable-PnpDevice' : 'Disable-PnpDevice';
  const command = `powershell -command "${action} -InstanceId '${instanceId}' -Confirm:$false"`;

  try {
    await window.api.runCommand(command);
    setTimeout(displayScreens, 1000);
  } catch (error) {
    console.error(`Error toggling screen ${instanceId}:`, error);
  }
}


async function saveProfile() {
  const profileNameInput = document.getElementById('profile-name');
  const profileName = profileNameInput.value;
  if (!profileName) {
    alert('Please enter a profile name.');
    return;
  }

  const monitors = await getMonitorInfo();
  const screenStatus = {};
  monitors.forEach(monitor => {
    screenStatus[monitor.InstanceId] = monitor.Status === 'OK';
  });

  profiles[profileName] = screenStatus;
  await window.api.saveProfiles(profiles);
  profileNameInput.value = '';
  loadProfiles(); // Refresh profile list
}

async function loadProfiles() {
  profiles = await window.api.loadProfiles();
  const profileListDiv = document.getElementById('profile-list');
  profileListDiv.innerHTML = '';
  for (const profileName in profiles) {
    const profileDiv = document.createElement('div');
    profileDiv.classList.add('profile-item');
    profileDiv.innerHTML = `
      <span>${profileName}</span>
      <button onclick="applyProfile('${profileName}')">Load</button>
      <button onclick="deleteProfile('${profileName}')">Delete</button>
    `;
    profileListDiv.appendChild(profileDiv);
  }
}

async function applyProfile(profileName) {
  const profile = profiles[profileName];
  if (!profile) return;

  for (const instanceId in profile) {
    await toggleScreen(instanceId, profile[instanceId]);
  }
}

async function deleteProfile(profileName) {
    if (confirm(`Are you sure you want to delete the profile "${profileName}"?`)) {
        delete profiles[profileName];
        await window.api.saveProfiles(profiles);
        loadProfiles();
    }
}
